'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, LayoutDashboard, CalendarDays, Check, ChevronRight, ArrowLeft, Plus, Clock3, Target, FileCheck2, Sprout, ListChecks, RotateCcw, Download, Settings2, X, Keyboard, Grid2X2, CheckCircle2, CircleAlert } from 'lucide-react';
import { Mascot } from '@/components/Mascot';
import { ChoiceQuestion } from '@/components/question/ChoiceQuestion';
import { FillBlankQuestion } from '@/components/question/FillBlankQuestion';
import { FillBlankTextQuestion } from '@/components/question/FillBlankTextQuestion';
import { QuestionPrompt } from '@/components/question/QuestionPrompt';
import { playSfx, setMuted } from '@/lib/sfx';
import { BANK, COURSES, TEMPLATES, typeName, editionName, type Course, type FamilyQuestion } from './data';
import { STORAGE_KEY, advance, begin, check, createPlan, decode, initialState, localDate, mistakes, type State, type Attempt, type Plan } from './domain';
import { learningReport, weeklyLearningReport } from './report';
import { WeeklyPanel } from './WeeklyPanel';
import { scheduleWeekly, weeklyTopics } from './weekly';

type Role = 'child' | 'parent';
type Tab = 'today' | 'wrong' | 'history' | 'plans' | 'reports' | 'courses' | 'weekly';
const dateLabel = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
const percent = (a: Attempt) => Math.round(a.score / a.total * 100);
const fmtTime = (a: Attempt) => {
  const n = Math.max(1, Math.round((Date.parse(a.completedAt) - Date.parse(a.startedAt)) / 60000));
  return n < 60 ? `${n} 分钟` : `${Math.floor(n/60)} 小时 ${n%60} 分钟`;
};
const responseAnswer = (answer: string, q: Attempt['responses'][number]['question']) => q.type === 'choice' ? (q.options[answer.trim().toUpperCase().charCodeAt(0)-65] ?? answer) : answer;

function download(name: string, content: string, mime = 'application/json;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Dialog({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const closer = useRef(close); closer.current = close;
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    const focusables = () => [...box.current!.querySelectorAll<HTMLElement>('button, input, a[href], [tabindex="0"]')].filter(x => !x.hasAttribute('disabled'));
    focusables()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closer.current();
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === list.at(-1)) { e.preventDefault(); list[0]?.focus(); }
    };
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = overflow; old?.focus(); };
  }, []);
  return <div className="dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) close(); }}><div ref={box} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="section-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={close} aria-label="关闭弹窗"><X size={20}/></button></div>{children}</div></div>;
}

export default function FamilyApp() {
  const [state, setState] = useState<State | null>(null);
  const stateRef = useRef<State | null>(null);
  const persisted = useRef<string | null>(null);
  const [recovery, setRecovery] = useState<{ raw: string; message: string } | null>(null);
  const [storageWarning, setStorageWarning] = useState('');
  const [notice, setNotice] = useState('');
  const [role, setRole] = useState<Role>('child');
  const [tab, setTab] = useState<Tab>('today');
  const [today, setToday] = useState(localDate());
  const [weeklyNow, setWeeklyNow] = useState(()=>new Date());
  const [running, setRunning] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [builder, setBuilder] = useState(false);
  const [settings, setSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exit, setExit] = useState(false);
  const [typed, setTyped] = useState(false);
  const [composing, setComposing] = useState(false);
  const [sound, setSound] = useState(false);
  const [name, setName] = useState(TEMPLATES[0].name);
  const [planDate, setPlanDate] = useState(localDate());
  const [minutes, setMinutes] = useState(10);
  const [selected, setSelected] = useState<number[]>(TEMPLATES[0].ids);
  const [subject, setSubject] = useState('全部');
  const [courseSubject, setCourseSubject] = useState<'语文' | '数学'>('语文');
  const [edition, setEdition] = useState<Course['edition']>('tongbian-2026');
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [builderCourse, setBuilderCourse] = useState('');
  const [custom, setCustom] = useState<FamilyQuestion[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  function install(next: State) { stateRef.current = next; setState(next); setWeeklyNow(new Date()); }
  useEffect(() => {
    setMuted(true);
    let data: State;
    try {
      const raw = localStorage.getItem(STORAGE_KEY); persisted.current = raw;
      try { data = raw ? decode(raw) : initialState(); }
      catch (e) { setRecovery({ raw: raw!, message: String(e) }); return; }
      if (!raw) {
        try { const text = JSON.stringify(data); localStorage.setItem(STORAGE_KEY, text); persisted.current = text; }
        catch { setStorageWarning('当前浏览器无法保存数据，进度只保留到页面关闭。请用“导出备份”保存副本。'); }
      }
    } catch {
      data = initialState(); setStorageWarning('当前浏览器禁止本地存储，进度只保留到页面关闭。请用“导出备份”保存副本。');
    }
    install(data);
    const initialRole = location.hash === '#parent' ? 'parent' : 'child';
    setRole(initialRole); setTab(initialRole === 'parent' ? 'plans' : 'today');
    setRunning(initialRole === 'child' && !!data.session);
    const hash = () => { const r = location.hash === '#parent' ? 'parent' : 'child'; setRole(r); setTab(r === 'parent' ? 'plans' : 'today'); setBuilder(false); setResultId(null); setRunning(false); };
    const sync = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      if (!e.newValue) { location.reload(); return; }
      try { const next = decode(e.newValue); persisted.current = e.newValue; install(next); setNotice('已同步本浏览器另一个标签页的数据。'); }
      catch { setNotice('另一个标签页的数据格式有误，请刷新检查。'); }
    };
    const updateDay = () => {setToday(localDate());setWeeklyNow(new Date());};
    window.addEventListener('hashchange', hash); window.addEventListener('storage', sync);
    window.addEventListener('focus', updateDay); const timer = setInterval(updateDay, 30000);
    return () => { window.removeEventListener('hashchange', hash); window.removeEventListener('storage', sync); window.removeEventListener('focus', updateDay); clearInterval(timer); };
  }, []);
  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(t); } }, [notice]);
  useEffect(() => { headingRef.current?.focus(); window.scrollTo({ top: 0, behavior: 'auto' }); }, [tab, builder, running, resultId, state?.session?.index]);

  // One write per interaction. Never clear upstream csf-* records.
  function commit(update: (s: State) => State): State | null {
    if (!stateRef.current) return null;
    try {
      let raw: string | null = persisted.current;
      try { raw = localStorage.getItem(STORAGE_KEY); } catch { /* Memory-only mode is surfaced below. */ }
      if (raw !== persisted.current) {
        if (raw) { install(decode(raw)); persisted.current = raw; setNotice('数据刚在其他标签页更新，请再次操作。'); }
        else location.reload();
        return null;
      }
      const next = update(stateRef.current);
      if (next === stateRef.current) return next;
      try { const text = JSON.stringify(next); localStorage.setItem(STORAGE_KEY, text); persisted.current = text; setStorageWarning(''); }
      catch { setStorageWarning('本次进度仅保存在页面内，本地存储不可用或空间不足。关闭前请导出备份。'); }
      install(next); return next;
    } catch (e) { setNotice(e instanceof Error ? e.message : '操作未完成，请重试。'); return null; }
  }
  function switchRole(r: Role) {
    setRole(r); setTab(r === 'parent' ? 'plans' : 'today'); setBuilder(false); setResultId(null); setRunning(false);
    history.replaceState(null, '', r === 'parent' ? '#parent' : '#child');
  }
  function navigate(t: Tab) { setTab(t); setBuilder(false); setResultId(null); setRunning(false); setCourse(null); }
  function coursePractice(c: Course) {
    if (role === 'parent') { setBuilderCourse(c.id); setSelected(c.questions.map(q=>q.id)); setName(`${c.title} · 课后练习`); setMinutes(c.subject==='语文'?8:6); setPlanDate(today); setBuilder(true); return; }
    const next = commit(s => {
      if (s.session) throw new Error('请先完成进行中的练习，再开始其他课程。');
      const p = createPlan(`${c.title} · 自主练习`,today,c.subject==='语文'?8:6,c.questions);
      return begin({...s,plans:[...s.plans,p]},p.id);
    });
    if(next?.session) {setRunning(true);setTyped(false);setResultId(null);}
  }
  function addCustom() {
    if (!customPrompt.trim() || !customAnswer.trim()) {setNotice('请填写题干或拼音提示，以及标准答案。');return;}
    if(selected.length>=12){setNotice('每份最多 12 道题，请先取消一些题目。');return;}
    const q: FamilyQuestion={id:Date.now(),type:'fill_blank_text',subject:'语文',mode:'dictation',score:10,difficulty:1,options:[],question:customPrompt.trim(),answer:customAnswer.trim(),knowledge_point:'家长补充 · 默写',explanation:'请对照家长填写的标准答案，检查漏字、错字和顺序。',lessonId:builderCourse||undefined};
    setCustom(v=>[...v,q]);setSelected(v=>[...v,q.id]);setCustomPrompt('');setCustomAnswer('');setNotice('已加入这份练习，布置后会保存。');
  }
  function start(plan: Plan) {
    const next = commit(s => begin(s, plan.id));
    if (next?.session?.planId === plan.id) { setTyped(false); setComposing(false); setRunning(true); setResultId(null); }
  }
  function doCheck() {
    if (composing) return;
    const next = commit(check);
    const r = next?.session?.responses[next.session.index];
    const quiet=next?.plans.find(p=>p.id===next.session?.planId)?.weekly?.stage==='check';
    if (r && r.correct !== null && !quiet) playSfx(r.correct ? 'correct' : 'wrong');
  }
  function nextQuestion() {
    const id = stateRef.current?.session?.id;
    const next = commit(advance);
    setTyped(false); setComposing(false);
    if (next && !next.session && id) { setRunning(false); setResultId(id); playSfx('complete'); }
  }
  function publish() {
    if (!selected.length) { setNotice('至少选一道题，再布置练习。'); return; }
    const next = commit(s => ({ ...s, plans: [...s.plans, createPlan(name, planDate, minutes, selected.map(id => [...BANK,...custom].find(q => q.id === id)!))] }));
    if (next) { setBuilder(false); setTab('plans'); setNotice('练习已布置，切换到孩子端就能开始。'); }
  }
  function review() {
    const next = commit(s => {
      if (s.session) throw new Error('请先完成进行中的练习，再练错题。');
      const items = mistakes(s).slice(0,12);
      if (!items.length) return s;
      const p = createPlan('错题再出发', today, Math.max(3, items.length), items.map(r => r.question), 'review');
      return begin({ ...s, plans: [...s.plans, p] }, p.id);
    });
    if (next?.session) { setRunning(true); setTyped(false); setResultId(null); }
  }
  function reset() {
    try { const fresh = initialState(), raw = JSON.stringify(fresh); localStorage.setItem(STORAGE_KEY, raw); persisted.current = raw; location.reload(); }
    catch { setNotice('浏览器阻止了本地存储操作，未重置数据。'); }
  }
  function prepareWeekly(stage:'practice'|'check',keys?:string[]) {
    let plan:Plan|undefined;
    const next=commit(s=>{const scheduled=scheduleWeekly(s,stage,keys,new Date());plan=scheduled.plan;return scheduled.state;});
    if(!next||!plan)return;
    if(role==='child'&&!next.session&&Date.parse(plan.weekly!.readyAt)<=Date.now())start(plan);
    else setNotice(stage==='practice'?'同类巩固已安排，孩子端可开始。':'隔日复测已安排，到开放时间后再独立完成。');
  }
  function exportWeekly() {
    try {const report=weeklyLearningReport(stateRef.current!,new Date());download(report.filename,report.html,'text/html;charset=utf-8');setNotice('一周巩固报告已下载，可阅读、打印或另存为 PDF。');}
    catch(e){setNotice(e instanceof Error?e.message:'报告导出未完成。');}
  }
  const exportData = () => { if (state) download(`聪聪家庭练习-${today}.json`, JSON.stringify(state, null, 2)); };
  const exportReport = (attempts: Attempt[]) => {
    try { const report = learningReport(attempts); download(report.filename, report.html, 'text/html;charset=utf-8'); setNotice('学习报告已下载，用浏览器打开即可阅读、打印或另存为 PDF。'); }
    catch (e) { setNotice(e instanceof Error ? e.message : '报告导出未完成，请重试。'); }
  };

  if (recovery) return <main className="recovery"><CircleAlert size={40}/><h1>本地数据需要检查</h1><p>没有覆盖原记录。可以先导出原始数据，再重置体验版。</p><p className="muted">{recovery.message}</p><div className="button-row"><button className="primary" onClick={() => download('聪聪-原始数据.json', recovery.raw)}>导出原始数据</button><button className="secondary" onClick={() => setConfirmReset(true)}>重置体验数据</button></div>{confirmReset && <Dialog title="重置本机体验数据？" close={() => setConfirmReset(false)}><p>仅清空家庭体验版的练习、结果和进度。请先导出需要保留的内容。</p><button className="danger" onClick={reset}>确认重置</button></Dialog>}</main>;
  if (!state) return <main className="recovery"><Sprout size={40}/><h1>聪聪正在准备练习…</h1></main>;

  const todays = state.plans.filter(p => p.date === today);
  const finished = (id: string) => state.attempts.find(a => a.planId === id);
  const doneToday = todays.filter(p => finished(p.id)).length;
  const wrongs = mistakes(state);
  const current = state.session;
  const activePlan = current && state.plans.find(p => p.id === current.planId);
  const result = state.attempts.find(a => a.id === resultId);
  const latest = [...state.attempts].reverse();
  const currentQ = activePlan && current ? activePlan.questions[current.index] : null;
  const checked = current?.responses[current.index];
  const independent=activePlan?.weekly?.stage==='check';
  const weeklySummary=weeklyTopics(state,weeklyNow);
  const navItems = role === 'child'
    ? [{ id: 'today' as Tab, label: '今天的练习', icon: BookOpen }, { id: 'courses' as Tab, label: '自由选课', icon: Grid2X2 }, { id: 'wrong' as Tab, label: '我的错题', icon: RotateCcw }, { id: 'weekly' as Tab, label: '一周巩固', icon: Target }, { id: 'history' as Tab, label: '成长记录', icon: Sprout }]
    : [{ id: 'plans' as Tab, label: '练习安排', icon: CalendarDays }, { id: 'courses' as Tab, label: '按课文选题', icon: Grid2X2 }, { id: 'reports' as Tab, label: '学习结果', icon: FileCheck2 }, { id: 'weekly' as Tab, label: '一周巩固', icon: Target }];
  const builderItems=[...BANK.filter(q=>builderCourse?q.lessonId===builderCourse:selected.includes(q.id)),...custom];

  function planCard(p: Plan) {
    const a = finished(p.id), isResume = current?.planId === p.id;
    const isFuture = p.date > today || !!p.weekly && Date.parse(p.weekly.readyAt)>weeklyNow.getTime();
    const stale=p.weekly?.stage==='check'&&p.weekly.topics.some(ref=>{const t=weeklySummary.find(t=>t.key===ref.key);return t&&(!t.practice||t.practice.id!==ref.practiceId||t.lastWrongAt!==ref.lastWrongAt);});
    return <article className="plan-card" key={p.id}>
      <div className={`subject-icon ${p.kind === 'review' ? 'peach' : 'sage'}`}>{p.kind === 'review' ? <RotateCcw/> : <BookOpen/>}</div>
      <div className="plan-info"><div className="card-kicker">{p.questions.every(q => q.subject === '语文') ? '语文' : p.questions.every(q => q.subject === '数学') ? '数学' : '语文 + 数学'}{p.kind === 'review' ? ' · 错题巩固' : ' · 基础练习'}</div><h3>{p.title}</h3><p><span>{p.questions.length} 道题</span><span>约 {p.minutes} 分钟</span>{role === 'parent' && <span>{p.date}</span>}</p></div>
      <div className="plan-action">{a ? <><span className="status-done"><CheckCircle2 size={16}/>已完成</span><button className="text-button" onClick={() => setResultId(a.id)}>查看结果 <ChevronRight size={16}/></button></> : role === 'child' ? <><span className="muted small">{isResume ? '进度已保留' : stale ? '出现新错题，需重新巩固' : isFuture ? '尚未到开放时间' : '准备好了吗？'}</span><button className="primary" disabled={stale || isFuture || (!!current && !isResume)} onClick={() => start(p)}>{isResume ? '继续练习' : '开始练习'} <ChevronRight size={18}/></button></> : <span className="status-pending">{stale ? '需重新巩固' : isResume ? '练习中' : isFuture ? '已安排' : '待完成'}</span>}</div>
    </article>;
  }

  return <div className="family-app">
    <a className="skip-link" href="#content">跳到主要内容</a>
    <header className="topbar"><div className="topbar-inner">
      <button className="brand" onClick={() => navigate(role === 'child' ? 'today' : 'plans')} aria-label="聪聪学堂首页"><div className="brand-mark"><Mascot size={43} animate={false} skinOverride={null}/></div><div><strong>聪聪学堂<span>二年级上册</span></strong><small>统编语文 · 苏教数学 · 每天一小步</small></div></button>
      <div className="topbar-actions"><span className="local-pill"><i/>在线体验版</span><div className="role-switch" aria-label="切换体验角色"><button aria-pressed={role === 'child'} className={role === 'child' ? 'active' : ''} onClick={() => switchRole('child')}>孩子端</button><button aria-pressed={role === 'parent'} className={role === 'parent' ? 'active' : ''} onClick={() => switchRole('parent')}>家长端</button></div><button className="icon-button" onClick={() => setSettings(true)} aria-label="体验版设置"><Settings2 size={21}/></button></div>
    </div></header>
    {storageWarning && <div className="storage-warning" role="alert"><CircleAlert size={18}/><span>{storageWarning}</span><button onClick={exportData}>导出备份</button></div>}
    <div className={`workspace ${running && activePlan ? 'is-running' : ''}`}>
      {!running && <aside className="sidebar"><div className="sidebar-label">{role === 'child' ? '我的学习空间' : '家长工作台'}</div><nav aria-label={role === 'child' ? '学习导航' : '家长导航'}>{navItems.map(({id, label, icon: Icon}) => <button key={id} className={tab === id && !builder && !result ? 'nav-active' : ''} onClick={() => navigate(id)} aria-current={tab === id && !builder && !result ? 'page' : undefined}><Icon size={21}/><span>{label}</span>{id === 'wrong' && wrongs.length > 0 && <b>{wrongs.length}</b>}</button>)}</nav><div className="sidebar-note"><Sprout size={23}/><strong>慢慢来，也很棒</strong><p>认真想一想，<br/>每一次尝试都有收获。</p></div><div className="privacy-note">无需登录 · 无真实身份信息<br/>数据仅保存在当前浏览器</div></aside>}
      <main id="content" className="main-content">
      {running && activePlan && current && currentQ ? <div className="practice-layout">
        <div className="practice-top"><button className="text-button" onClick={() => setExit(true)}><ArrowLeft size={18}/>保存并离开</button><span>{activePlan.title}</span><button className="text-button" aria-pressed={sound} onClick={() => { setSound(!sound); setMuted(sound); }}>音效{sound ? '开' : '关'}</button></div>
        <div className="practice-progress"><div className="progress-track"><div style={{ width: `${current.responses.length / activePlan.questions.length * 100}%` }}/></div><span>{current.index+1} / {activePlan.questions.length}</span></div>
        {independent && <div className="independent-note"><Target size={18}/><span>独立复测：先自己完成，答完全部题目后统一看答案和讲解。</span></div>}
        <div className="question-paper"><div className="question-label"><span className={currentQ.subject === '语文' ? 'subject-tag chinese' : 'subject-tag math'}>{currentQ.subject} · {typeName(currentQ)}</span><span>{currentQ.knowledge_point}</span></div>
          <h1 className="sr-only" ref={headingRef} tabIndex={-1}>第 {current.index+1} 题</h1>
          {currentQ.type !== 'choice' && !currentQ.mode && <div className="input-switch"><button aria-pressed={!typed} onClick={() => setTyped(false)}><Grid2X2 size={16}/>{currentQ.subject === '数学' ? '数字键盘' : '字卡填空'}</button><button aria-pressed={typed} onClick={() => setTyped(true)}><Keyboard size={16}/>键盘输入</button></div>}
          <div className="question-body" key={currentQ.id}>
          {currentQ.type === 'choice' ? <ChoiceQuestion question={currentQ} answer={current.answer} phase={checked && !independent ? 'checked' : 'answering'} isCorrect={checked?.correct ?? null} onChange={answer => commit(s => s.session && !s.session.responses[s.session.index] ? ({...s, session: {...s.session, answer}}) : s)} locked={exit || settings || (independent && !!checked)}/>
            : (typed || !!currentQ.mode) ? <><QuestionPrompt text={currentQ.question} locked={exit || settings || (independent && !!checked)}/><label htmlFor="answer" className="answer-label">{currentQ.mode === 'writing' ? '写下自己的句子，稍后和家长交流' : currentQ.mode === 'dictation' ? '在这里默写你的答案' : '在这里填写答案'}</label><textarea id="answer" className={`native-answer ${checked && !independent ? checked.correct ? 'answer-correct' : 'answer-wrong' : ''}`} rows={2} maxLength={240} inputMode={currentQ.subject === '数学' ? 'text' : undefined} enterKeyHint="done" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder={currentQ.subject === '数学' ? '例如：6 或 3/4' : '点击这里，用中文键盘输入'} value={current.answer} disabled={!!checked || exit || settings} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onChange={e => { const answer = e.target.value; commit(s => s.session && !s.session.responses[s.session.index] ? ({...s, session: {...s.session, answer}}) : s); }}/><p className="muted small">{currentQ.mode === 'writing' ? '仿写只记录原文，不自动判分，由家长阅读交流。' : currentQ.subject === '数学' ? '只填写数值，不需要单位。' : '忽略空格与常见标点，汉字需要准确。可使用 iPad 系统中文输入法。'}</p></>
            : currentQ.subject === '语文' ? <FillBlankTextQuestion question={currentQ} answer={current.answer} phase={checked && !independent ? 'checked' : 'answering'} isCorrect={checked?.correct ?? null} onChange={answer => commit(s => s.session && !s.session.responses[s.session.index] ? ({...s, session: {...s.session, answer}}) : s)} locked={exit || settings || (independent && !!checked)}/>
            : <FillBlankQuestion question={currentQ} answer={current.answer} phase={checked && !independent ? 'checked' : 'answering'} isCorrect={checked?.correct ?? null} onChange={answer => commit(s => s.session && !s.session.responses[s.session.index] ? ({...s, session: {...s.session, answer}}) : s)} locked={exit || settings || (independent && !!checked)}/>}
          </div>
          {checked ? independent ? <div className="independent-feedback" role="status"><strong>答案已记录</strong><p>先独立完成这一轮，最后一起看结果。</p><button className="primary wide" onClick={nextQuestion}>{current.index===activePlan.questions.length-1?'提交复测，查看结果':'记录好了，下一题'}<ChevronRight size={18}/></button></div> : <div className={`answer-feedback ${checked.correct ? 'correct' : 'wrong'}`} role="status"><div className="feedback-title">{checked.correct ? <CheckCircle2 size={24}/> : <Sprout size={24}/>}<strong>{checked.correct === null ? '仿写已记下，给家长看看吧' : checked.correct ? '答对啦，继续保持！' : '没关系，我们一起看看'}</strong></div>{checked.correct === false && <p>参考答案：<strong>{responseAnswer(currentQ.answer, currentQ)}</strong></p>}{checked.correct === null && <p>参考示例（答案不唯一）：{currentQ.answer}</p>}<p>{currentQ.explanation}</p><button className="primary wide" onClick={nextQuestion}>{current.index === activePlan.questions.length-1 ? '完成练习，查看结果' : '下一题'}<ChevronRight size={18}/></button></div>
          : <div className="question-submit"><span className="muted small">想好了，就检查一下吧</span><button className="primary" disabled={!current.answer.trim() || composing} onClick={doCheck}>{independent ? '记录答案' : currentQ.mode === 'writing' ? '记录仿写' : '检查答案'} <Check size={18}/></button></div>}
        </div>
        <p className="practice-saving"><CheckCircle2 size={14}/>{storageWarning ? '进度暂存在本页面，请导出保存' : '每次作答都会保存，随时可以回来继续'}</p>
      </div>
      : result ? <>
        <div className="section-heading"><button className="text-button back-button" onClick={() => setResultId(null)}><ArrowLeft size={18}/>返回{role === 'parent' ? '家长端' : '学习空间'}</button><button className="secondary" onClick={() => exportReport([result])}><Download size={17}/>导出本次报告</button></div>
        <div className="result-hero"><div><span className="eyebrow">每一次认真，都算数</span><h1 ref={headingRef} tabIndex={-1}>{percent(result) === 100 ? '全部答对，做得很棒！' : '练习完成，又进步了一点！'}</h1><p>{result.title} · {result.date}</p></div><Mascot size={112} mood="proud" skinOverride={null}/></div>
        <div className="stats-grid result-stats"><div><span>本次得分</span><strong>{result.score}<small> / {result.total}</small></strong></div><div><span>客观题答对</span><strong>{result.responses.filter(r => r.correct).length}<small> / {result.responses.filter(r=>r.correct!==null).length}</small></strong></div><div><span>正确率</span><strong>{percent(result)}<small>%</small></strong></div><div><span>练习用时</span><strong className="time-value">{fmtTime(result)}</strong></div></div>
        {result.weekly && <div className="weekly-result"><strong>{result.weekly.stage==='check'?'隔日独立复测结果':'同类巩固结果'}</strong>{weeklySummary.filter(t=>result.weekly!.topics.some(ref=>ref.key===t.key)).map(t=><p key={t.key}>{t.label}：<b>{t.statusLabel}</b>{t.readyAt&&t.status==='waiting'?` · ${new Date(t.readyAt).toLocaleString('zh-CN',{hour12:false})}起可复测`:''}</p>)}<button className="text-button" onClick={()=>navigate('weekly')}>查看一周巩固进度 <ChevronRight size={16}/></button></div>}
        <div className="section-heading"><h2>逐题回顾</h2><span className="muted small">错题已收进“我的错题”</span></div><div className="review-list">{result.responses.map((r,i) => <article key={r.question.id} className="review-card"><span className={`review-number ${r.correct ? 'right' : 'wrong'}`}>{r.correct ? <Check size={19}/> : i+1}</span><div><div className="card-kicker">{r.question.subject} · {r.question.knowledge_point} · {r.correct === null ? '仿写 · 待交流' : r.correct ? '正确' : '待巩固'}</div><h3>{r.question.question}</h3><p>你的答案：<strong className={r.correct === null ? '' : r.correct ? 'green-text' : 'red-text'}>{responseAnswer(r.answer,r.question)}</strong></p>{r.correct === false && <p>参考答案：<strong>{responseAnswer(r.question.answer,r.question)}</strong></p>}<p className="explanation">{r.question.explanation}</p></div></article>)}</div>
        {role === 'child' && <div className="button-row result-actions"><button className="primary" onClick={() => { setResultId(null); setTab('today'); }}>回到今天的练习</button>{wrongs.length > 0 && <button className="secondary" onClick={review}>再练错题</button>}<button className="text-button" onClick={() => switchRole('parent')}>给家长看结果 <ChevronRight size={17}/></button></div>}
      </>
      : tab === 'weekly' ? <WeeklyPanel state={state} role={role} now={weeklyNow} headingRef={headingRef} schedule={prepareWeekly} start={start} exportReport={exportWeekly}/>
      : builder ? <>
        <button className="text-button back-button" onClick={() => setBuilder(false)}><ArrowLeft size={18}/>返回练习安排</button><div className="page-heading"><div><span className="eyebrow">一点准备，让陪伴更轻松</span><h1 ref={headingRef} tabIndex={-1}>布置一份小练习</h1><p>选择现成组合，或自己挑选今天想练的题。</p></div></div>
        <div className="template-grid">{TEMPLATES.map(t => <button key={t.id} className={`template-card ${selected.join(',') === t.ids.join(',') ? 'selected' : ''}`} onClick={() => { setSelected(t.ids); setName(t.name); setMinutes(t.minutes); setBuilderCourse(''); }}><span className="template-icon">{t.id === 'chinese' ? '文' : t.id === 'math' ? '数' : '语数'}</span><strong>{t.name}</strong><p>{t.note}</p><small>{t.ids.length} 道题 · 约 {t.minutes} 分钟</small></button>)}</div>
        <div className="course-toolbar"><label className="muted small" style={{flex:1}}>按课文 / 单元选择<select aria-label="布置练习的课文或单元" value={builderCourse} onChange={e=>{const c=COURSES.find(c=>c.id===e.target.value);setBuilderCourse(e.target.value);if(c){setSelected(c.questions.map(q=>q.id));setName(`${c.title} · 课后练习`);setMinutes(c.subject==='语文'?8:6);}}}><option value="">当前组合</option>{(['tongbian-2026','sujiao-math'] as const).map(ed=><optgroup key={ed} label={editionName(ed)}>{COURSES.filter(c=>c.edition===ed).map(c=><option key={c.id} value={c.id}>{c.section} · {c.title}</option>)}</optgroup>)}</select></label></div>
        <div className="builder-meta panel"><label>练习名称<input value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="给练习起个名字"/></label><label>练习日期<input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)}/></label><label>预计分钟<input type="number" min="1" max="60" value={minutes} onChange={e => setMinutes(Number(e.target.value))}/></label></div>
        <div className="section-heading"><h2>挑选题目 <span className="count-pill">{selected.length} / 12</span></h2><div className="filter-tabs" aria-label="按学科筛选">{['全部','语文','数学'].map(s => <button key={s} aria-pressed={subject===s} onClick={() => setSubject(s)}>{s}</button>)}</div></div>
        <p className="muted small question-bank-note">二年级上册自编示例题。默写与填空自动判分，仿写保存原文供家长查看；请先预览并按学校要求调整。</p>
        <div className="selection-list">{builderItems.filter(q => subject === '全部' || q.subject === subject).map(q => <label key={q.id} className={`selection-card ${selected.includes(q.id) ? 'selected' : ''}`}><input type="checkbox" checked={selected.includes(q.id)} onChange={e => setSelected(e.target.checked ? (selected.length<12?[...selected,q.id]:selected) : selected.filter(id => id!==q.id))}/><span><span className="card-kicker">{q.subject} · {typeName(q)} · {q.knowledge_point}</span><strong>{q.question}</strong><details onClick={e => e.stopPropagation()}><summary>预览答案与解析</summary><p>{responseAnswer(q.answer,q)} · {q.explanation}</p></details></span></label>)}</div>
        <section className="panel custom-question"><h3>补充老师要求的默写内容</h3><p className="muted small">可填写生字词与拼音提示，或需要背诵的短片段。只保存在本地这份练习中。</p><label>题干 / 拼音 / 背诵提示<input maxLength={180} value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)} placeholder="例如：看拼音写词语：zhī shi"/></label><label>标准答案<textarea maxLength={240} rows={2} value={customAnswer} onChange={e=>setCustomAnswer(e.target.value)} placeholder="例如：知识（或老师要求背诵的短片段）"/></label><button className="secondary" disabled={!customPrompt.trim()||!customAnswer.trim()||selected.length>=12} onClick={addCustom}><Plus size={17}/>加入这份练习</button></section>
        <div className="builder-footer"><span>已选 <strong>{selected.length}</strong> 道题<span className="muted small"> · 仿写不计分</span></span><button className="primary" onClick={publish} disabled={!selected.length || !name.trim() || !planDate || !Number.isInteger(minutes) || minutes<1 || minutes>60}>布置练习 <ChevronRight size={18}/></button></div>
      </>
      : tab === 'courses' ? <>
        <div className="page-heading"><div><span className="eyebrow">二年级上册 · 从你正在学的地方开始</span><h1 ref={headingRef} tabIndex={-1}>{course ? course.title : '想学哪一课，就选哪一课'}</h1><p>所有课目都可以直接进入，无需完成前面的课程。</p></div>{course && <button className="secondary" onClick={()=>setCourse(null)}><ArrowLeft size={17}/>回到目录</button>}</div>
        {course ? <>
          <div className="course-note">{editionName(course.edition)} · {course.section} · 自编配套练习，不包含教材全文</div>
          <section className="course-detail"><span className={`subject-tag ${course.subject==='语文'?'chinese':'math'}`}>{course.subject} · 课后练习</span><h2>{course.subject==='语文'?'生字词默写 + 知识拓展':'选一组选填题，巩固这单元'}</h2><p>{course.subject==='语文'?'看拼音写词语、生字填空、部分古诗背诵片段和一句话仿写。家长可以再添加老师要求的默写内容。':'每组 4 道自编选择或填空题。先读题、独立作答，再看解析。'}</p><div className="button-row"><button className="primary" disabled={role==='child'&&!!current} onClick={()=>coursePractice(course)}>{role==='parent'?'用这课布置练习':'直接开始这课练习'}<ChevronRight size={18}/></button><span className="muted small">{course.questions.length} 道题{course.subject==='语文'?' · 仿写只记录、不计分':''}</span></div><div className="course-expansion"><h3><Sprout size={18} style={{display:'inline',verticalAlign:'middle',marginRight:7}}/>每课知识拓展</h3><p>{course.expansion}</p>{course.subject==='语文'&&<p>想一想：联系自己的生活，你还能举出什么例子？把你的想法写在仿写题里。</p>}</div></section>
          {current&&role==='child'&&<div className="inline-note">还有一份练习正在进行，请先到“今天的练习”继续完成。</div>}
        </> : <>
          <div className="course-toolbar"><div className="filter-tabs" aria-label="选择学科">{(['语文','数学'] as const).map(s=><button key={s} aria-pressed={courseSubject===s} onClick={()=>{setCourseSubject(s);setSearch('');}}>{s}</button>)}</div>{courseSubject==='语文'&&<select aria-label="语文教材目录" value={edition} onChange={e=>setEdition(e.target.value as Course['edition'])}><option value="tongbian-2026">统编语文 · 上游2026秋版目录</option></select>}<input type="search" className="course-search" aria-label="搜索课文或单元" value={search} onChange={e=>setSearch(e.target.value)} placeholder={courseSubject==='语文'?'搜索：如登鹳雀楼、夕阳真美':'搜索：如乘法、三位数'}/></div>
          <div className="course-note">{courseSubject==='语文'?'统编二年级上册，目录按上游 2026 秋版核对。词语为示例练习，非官方必默清单；必背内容以老师要求为准，可由家长补充。':'按苏教新课标二上 6 个核心单元组织自编示例题。综合实践活动暂未覆盖；请家长对照学校教材预览选题。'}</div>
          <div className="course-grid">{COURSES.filter(c=>c.subject===courseSubject&&(courseSubject==='数学'||c.edition===edition)&&c.title.includes(search.trim())).map(c=><button className="course-card" key={c.id} onClick={()=>setCourse(c)}><span className={`subject-icon ${c.subject==='语文'?'peach':'sage'}`}>{c.subject==='语文'?<BookOpen size={22}/>:<Target size={22}/>}</span><div><span className="card-kicker">{c.section} · 二年级上册</span><h3>{c.title}</h3><p>{c.subject==='语文'?'拼音提示 · 生字词 · 仿写拓展':'选择题 · 数字填空 · 解析'}</p><div className="course-count">{c.questions.length} 道示例题 · 可直接进入</div></div><ChevronRight size={18}/></button>)}</div>
          {!COURSES.some(c=>c.subject===courseSubject&&(courseSubject==='数学'||c.edition===edition)&&c.title.includes(search.trim()))&&<div className="empty"><BookOpen size={28}/><h3>没有找到这篇课文</h3><p>试试其他关键词，或切换学科。</p></div>}
        </>}
      </>
      : role === 'child' && tab === 'today' ? <>
        <div className="page-heading"><div><span className="eyebrow">{dateLabel(today)}</span><h1 ref={headingRef} tabIndex={-1}>今天，也一起学一点</h1><p>小小学习者，你的学习旅程准备好啦。</p></div><span className="learning-badge"><Sprout size={17}/>自主练习</span></div>
        <section className="welcome-card"><div><span className="welcome-label"><span/>和聪聪一起，慢慢变厉害</span><h2>每一小步，<br/>都在靠近更棒的自己。</h2><p>选一份练习，认真想想。<br/>做错也没关系，聪聪陪你再试一次。</p><span className="hero-caption"><Clock3 size={16}/>每天 10 分钟，积累一点点</span></div><div className="mascot-stage"><span className="spark spark-one">✦</span><span className="spark spark-two">✧</span><span className="mascot-circle"/><Mascot size={210} mood="wave" skinOverride={null}/><span className="speech-mini">准备好了吗？</span></div></section>
        <div className="stats-grid child-stats"><div><span><ListChecks size={17}/>今日完成</span><strong>{doneToday}<small> / {todays.length} 份</small></strong></div><div><span><Target size={17}/>累计练习</span><strong>{state.attempts.length}<small> 份</small></strong></div><div><span><Sprout size={17}/>待巩固错题</span><strong>{wrongs.length}<small> 道</small></strong></div></div>
        <div className="dashboard-grid"><section><div className="section-heading"><h2>今天的练习<span className="count-pill">{todays.length}</span></h2><span className="muted small">按自己的节奏来</span></div><div className="plan-list">{todays.length ? todays.map(planCard) : <div className="empty"><CalendarDays size={33}/><h3>今天还没有安排练习</h3><p>请家长切换到家长端，选一份轻松的小练习。</p><button className="secondary" onClick={() => switchRole('parent')}>去家长端</button></div>}</div>{current && activePlan && activePlan.date !== today && <section className="other-plans"><h2>继续上次的练习</h2>{planCard(activePlan)}</section>}{state.plans.some(p => p.date < today && !finished(p.id) && p.id !== current?.planId) && <section className="other-plans"><h2>之前未完成</h2>{state.plans.filter(p => p.date < today && !finished(p.id) && p.id !== current?.planId).map(planCard)}</section>}</section>
        <aside className="gentle-card"><span className="little-sun">☀</span><h3>今天的小约定</h3><ol><li><span>1</span>先读题，再动笔</li><li><span>2</span>不会也先想一想</li><li><span>3</span>做完回顾小错题</li></ol><p>认真完成比答得快更重要。</p></aside></div>
      </>
      : role === 'child' && tab === 'wrong' ? <>
        <div className="page-heading"><div><span className="eyebrow">把不会的，慢慢变成会的</span><h1 ref={headingRef} tabIndex={-1}>我的错题</h1><p>这里可订正原题；同类新题的练习和隔日复测请到“一周巩固”。</p></div>{wrongs.length > 0 && <button className="primary" disabled={!!current} onClick={review}><RotateCcw size={18}/>再练 {Math.min(wrongs.length,12)} 道题</button>}</div>
        {current && <div className="inline-note">先回“今天的练习”完成进行中的练习，再来巩固错题。</div>}
        {wrongs.length ? <div className="review-list">{wrongs.map(r => <article className="review-card" key={r.question.id}><span className="subject-icon peach"><BookOpen size={20}/></span><div><div className="card-kicker">{r.question.subject} · {r.question.knowledge_point}</div><h3>{r.question.question}</h3><p>上次答案：<strong className="red-text">{responseAnswer(r.answer,r.question)}</strong></p><details><summary>看看答案与讲解</summary><p>参考答案：{responseAnswer(r.question.answer,r.question)}</p><p>{r.question.explanation}</p></details></div></article>)}</div> : <div className="empty spacious"><Mascot size={130} mood="happy" skinOverride={null}/><h2>这里暂时没有错题</h2><p>做完练习后，需要巩固的题会自动收进来。</p><button className="primary" onClick={() => navigate('today')}>去做今天的练习</button></div>}
      </>
      : role === 'parent' && tab === 'plans' ? <>
        <div className="page-heading"><div><span className="eyebrow">陪伴有方向，学习有回响</span><h1 ref={headingRef} tabIndex={-1}>安排一点，收获一点</h1><p>布置当天练习，完成后回来看看孩子的收获。</p></div><button className="primary" onClick={() => { setBuilder(true); setBuilderCourse(''); setPlanDate(today); }}><Plus size={19}/>布置练习</button></div>
        <div className="parent-banner"><div className="subject-icon sage"><LayoutDashboard size={26}/></div><div><strong>一份练习，一次看得见的成长</strong><p>选题 → 孩子作答 → 自动判分 → 回顾结果</p></div><span className="local-pill"><i/>无需账号</span></div>
        <div className="stats-grid child-stats"><div><span>今天已布置</span><strong>{todays.length}<small> 份</small></strong></div><div><span>今天已完成</span><strong>{doneToday}<small> 份</small></strong></div><div><span>待巩固错题</span><strong>{wrongs.length}<small> 道</small></strong></div></div>
        <div className="section-heading"><h2>练习安排</h2><span className="muted small">共 {state.plans.length} 份 · {dateLabel(today)}</span></div><div className="plan-list">{[...state.plans].sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).map(planCard)}</div>
        <div className="section-heading report-heading"><h2>最近的练习结果</h2><button className="text-button" onClick={() => navigate('reports')}>查看全部 <ChevronRight size={16}/></button></div>{latest.length ? <div className="history-list">{latest.slice(0,3).map(a => <ResultRow key={a.id} attempt={a} open={() => setResultId(a.id)}/>)}</div> : <div className="empty compact"><FileCheck2 size={27}/><h3>等待第一份小收获</h3><p>孩子完成练习后，得分和逐题答案会显示在这里。</p><button className="text-button" onClick={() => switchRole('child')}>切换孩子端试一试 <ChevronRight size={16}/></button></div>}
        <div className="inline-note"><CircleAlert size={17}/><span>当前为同一浏览器内的角色模拟。电脑与 iPad 之间尚未同步；切换角色无需密码。</span></div>
      </>
      : <>
        <div className="page-heading"><div><span className="eyebrow">认真走过的每一步，都有记录</span><h1 ref={headingRef} tabIndex={-1}>{role === 'parent' ? '学习结果' : '成长记录'}</h1><p>{role === 'parent' ? '查看得分、原始作答和解析，找到下一次练习的方向。' : '看看自己完成的练习，也看看进步的自己。'}</p></div>{role === 'parent' && <button className="secondary" onClick={() => exportReport(state.attempts)} disabled={!latest.length}><Download size={17}/>导出学习报告</button>}</div>
        {latest.length ? <><div className="stats-grid child-stats"><div><span>已完成练习</span><strong>{latest.length}<small> 份</small></strong></div><div><span>累计作答</span><strong>{latest.reduce((n,a) => n+a.responses.length,0)}<small> 道</small></strong></div><div><span>累计正确率</span><strong>{Math.round(latest.reduce((n,a) => n+a.score,0)/latest.reduce((n,a) => n+a.total,0)*100)}<small>%</small></strong></div></div><div className="history-list">{latest.map(a => <ResultRow key={a.id} attempt={a} open={() => setResultId(a.id)}/>)}</div></> : <div className="empty spacious"><Mascot size={130} mood="think" skinOverride={null}/><h2>第一份成长记录，等你来写</h2><p>完成练习后，这里就会留下你的收获。</p><button className="primary" onClick={() => role === 'parent' ? switchRole('child') : navigate('today')}>去孩子端练习</button></div>}
      </>}
      <footer className="app-footer"><span>聪聪学堂 · 家庭练习体验版</span><span>基于开源项目 · <a href="https://github.com/wuwangzhang1216/congcong-school" target="_blank" rel="noreferrer">上游与 MIT 版权</a></span></footer>
      </main>
    </div>
    <div className="notice" role="status" aria-live="polite">{notice && <span>{notice}</span>}</div>
    {exit && <Dialog title="休息一下，稍后继续？" close={() => setExit(false)}><p>{storageWarning ? '当前只能暂存到页面关闭，请先通过设置导出数据。' : '当前答案和已完成的题目都已保存。回来后，点击“继续练习”即可接着做。'}</p><div className="button-row"><button className="secondary" onClick={() => setExit(false)}>继续做题</button><button className="primary" onClick={() => { setExit(false); setRunning(false); }}>保存并离开</button></div></Dialog>}
    {settings && <Dialog title="关于这个体验版" close={() => setSettings(false)}><p>用自编的语文、数学题，体验家长布置和孩子练习的完整流程。</p><div className="settings-note"><strong>本地保存，同一浏览器内体验</strong><p>不收集真实身份信息。地址、浏览器或设备不同，记录也不同；清除浏览器数据会删除记录。角色切换只是演示，不提供权限保护。</p><p>默写使用中文键盘输入，不包含手写识别、录音或语音判分。</p><p>给家长阅读的报告请在“学习结果”中导出；下方 JSON 备份用于保存程序记录。</p></div><p className="muted small">复用代码版权：© 2026 wangzhang wu · MIT License。完整许可随源码保留；未使用上游课本原页、图片或音频包。</p><div className="button-row"><button className="secondary" onClick={exportData}><Download size={17}/>导出数据备份（JSON）</button><button className="text-button red-text" onClick={() => { setSettings(false); setConfirmReset(true); }}>重置体验数据</button></div></Dialog>}
    {confirmReset && <Dialog title="重置本机体验数据？" close={() => setConfirmReset(false)}><p>这会删除家庭体验版的练习、结果和进行中的进度，并恢复一份当天示例练习。建议先导出备份。</p><div className="button-row"><button className="secondary" onClick={() => setConfirmReset(false)}>保留数据</button><button className="danger" onClick={reset}>确认重置</button></div></Dialog>}
  </div>;
}

function ResultRow({ attempt: a, open }: { attempt: Attempt; open: () => void }) {
  return <button className="history-row" onClick={open}><span className="subject-icon sage"><FileCheck2 size={22}/></span><span className="history-info"><strong>{a.title}</strong><small>{a.date} · {a.responses.length} 道题 · {fmtTime(a)}</small></span><span className="history-score"><strong>{a.score}<small> / {a.total}</small></strong><small>正确率 {percent(a)}%</small></span><ChevronRight size={19}/></button>;
}
