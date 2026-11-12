'use client';
import { Download, Sprout, CheckCircle2, Clock3, ChevronRight, BookOpen } from 'lucide-react';
import type { Ref } from 'react';
import type { Plan, State } from './domain';
import { weeklyTopics, weekWindow } from './weekly';

export function WeeklyPanel({state,role,now,headingRef,schedule,start,exportReport}:{state:State;role:'child'|'parent';now:Date;headingRef:Ref<HTMLHeadingElement>;schedule:(stage:'practice'|'check',keys?:string[])=>void;start:(p:Plan)=>void;exportReport:()=>void}) {
  const topics=weeklyTopics(state,now),window=weekWindow(now);
  const time=(at:string)=>new Date(at).toLocaleString('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
  return <>
    <div className="page-heading"><div><span className="eyebrow">{window.from} — {window.to} · 包含今天的最近 7 天</span><h1 ref={headingRef} tabIndex={-1}>一周错题，换题再检验</h1><p>先练会同类题，至少间隔 24 小时，再独立做未见过的新题。</p></div><button className="secondary" disabled={!topics.length} onClick={exportReport}><Download size={17}/>导出一周巩固报告</button></div>
    <div className="stats-grid result-stats"><div><span>近 7 天错答</span><strong>{topics.reduce((n,t)=>n+t.errors,0)}<small> 次</small></strong></div><div><span>仍需同类巩固</span><strong>{topics.filter(t=>t.status==='needs-practice').length}<small> 项</small></strong></div><div><span>待隔日复测</span><strong>{topics.filter(t=>['waiting','ready'].includes(t.status)).length}<small> 项</small></strong></div><div><span>本轮复测通过</span><strong>{topics.filter(t=>t.status==='passed').length}<small> 项</small></strong></div></div>
    <div className="weekly-process"><span><b>1</b>归纳易错知识点</span><ChevronRight size={16}/><span><b>2</b>做 2 道同类新题</span><ChevronRight size={16}/><span><b>3</b>隔日独立测 2 题</span></div>
    <div className="section-heading"><h2>这周重点巩固</h2><button className="primary" disabled={!topics.some(t=>t.status==='needs-practice'&&t.supported)||(role==='child'&&!!state.session)} onClick={()=>schedule('practice')}>{role==='parent'?'安排本周巩固':'开始本周巩固'}</button></div>
    <p className="muted small question-bank-note">每份最多 3 个知识点、每项 2 题。订正原题会保留记录，只有隔日新题全部答对才标记“本轮复测通过”。这表示本轮练习的表现，后续仍要观察。</p>
    {state.session&&<div className="inline-note">有一份练习正在进行。家长可以安排后续任务；孩子请先完成当前练习，再开始新的巩固。</div>}
    {topics.length?<div className="weekly-list">{topics.map(t=>{
      const task=t.status==='needs-practice'?t.pendingPractice:t.pendingCheck;
      const available=task&&Date.parse(task.weekly!.readyAt)<=now.getTime();
      const canStart=!state.session||state.session.planId===task?.id;
      return <article key={t.key} className="weekly-topic" data-status={t.status}>
        <div className="weekly-topic-heading"><div><span className="card-kicker">{t.subject} · {t.errors?`本周错答 ${t.errors} 次`:'上期延续巩固'} · 最近出错 {time(t.lastWrongAt)}</span><h3>{t.label}</h3></div><span className={`weekly-badge ${t.status}`} data-weekly-status={t.status}>{t.status==='passed'?<CheckCircle2 size={15}/>:<Sprout size={15}/>} {t.statusLabel}</span></div>
        <p className="weekly-note">{t.note}</p>
        <div className="weekly-evidence"><span>原题：{t.originalCorrected?'已订正':'保留错答记录'}</span><span>同类练习：{t.practice?'2 / 2 答对':'尚未通过'}</span><span>独立复测：{t.verification?'2 / 2 答对':'尚未通过'}</span></div>
        {t.readyAt&&t.status!=='passed'&&<p className="weekly-ready"><Clock3 size={15}/>{time(t.readyAt)} 起可独立复测，答完后统一看答案。</p>}
        {task&&<p className="muted small">已安排：{task.title} · {task.questions.length} 道题</p>}
        <div className="button-row weekly-actions">
          {t.status==='needs-practice'&&<button className="primary" disabled={role==='child'&&!canStart} onClick={()=>role==='child'&&task?start(task):schedule('practice',[t.key])}>{role==='parent'?(task?'同类巩固已安排':'安排这类新题'):(task?(state.session?.planId===task.id?'继续同类练习':'开始同类练习'):'练这类新题')}<ChevronRight size={16}/></button>}
          {['waiting','ready'].includes(t.status)&&(role==='parent'?<button className="secondary" onClick={()=>schedule('check',[t.key])}>{task?'已安排隔日复测':'安排隔日复测'}</button>:<button className="primary" disabled={!canStart||(!available&&!!task)} onClick={()=>task?start(task):schedule('check',[t.key])}>{task?(available?(state.session?.planId===task.id?'继续独立复测':'开始独立复测'):'等待复测开放'):'准备隔日复测'}<ChevronRight size={16}/></button>)}
          {t.status==='passed'&&<span className="green-text small">本轮两道未见新题都答对了，下周继续留意。</span>}
          {t.status==='unsupported'&&<span className="muted small">暂不自动标记掌握。可在布置练习中补充合适的新题。</span>}
        </div>
      </article>;
    })}</div>:<div className="empty spacious"><BookOpen size={36}/><h2>最近 7 天还没有错题</h2><p>完成练习后，错答会按知识点归到这里。没有错题时不会额外安排巩固任务。</p></div>}
  </>;
}
