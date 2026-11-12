import { createPlan, localDate, type Attempt, type Plan, type State, type WeeklyPlanInfo } from './domain';
import { focusFor, signature, variants, type Focus } from './weekly-questions';
import type { FamilyQuestion } from './data';

export const REVIEW_DELAY_MS=24*60*60*1000;
export type WeeklyStatus='needs-practice'|'waiting'|'ready'|'passed'|'unsupported';
export interface WeeklyTopic extends Focus {
  errors: number; sourceIds: number[]; lastWrongAt: string; originalCorrected: boolean;
  status: WeeklyStatus; statusLabel: string; practice?: Attempt; verification?: Attempt;
  pendingPractice?: Plan; pendingCheck?: Plan; readyAt?: string;
}
export function weekWindow(now=new Date()):{from:string;to:string;start:number;end:number} {
  const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());start.setDate(start.getDate()-6);
  return {from:localDate(start),to:localDate(now),start:start.getTime(),end:now.getTime()};
}
const completed=(state:State,id:string)=>state.attempts.some(a=>a.planId===id);
const info=(state:State,a:Attempt)=>a.weekly??state.plans.find(p=>p.id===a.planId)?.weekly;
function passedRows(a:Attempt,key:string):boolean {
  const rows=a.responses.filter(r=>r.question.weekly?.key===key);
  return rows.length>=2&&rows.every(r=>r.correct===true);
}
function weeklyAttempt(state:State,a:Attempt,key:string,stage:'practice'|'check'):boolean {
  const meta=info(state,a);return meta?.stage===stage&&meta.topics.some(t=>t.key===key)===true;
}
export function weeklyTopics(state:State,now=new Date()):WeeklyTopic[] {
  const window=weekWindow(now), groups=new Map<string,{focus:Focus;events:{at:string;id:number}[]}>();
  const sorted=[...state.attempts].filter(a=>Date.parse(a.completedAt)<=window.end).sort((a,b)=>a.completedAt.localeCompare(b.completedAt));
  for(const a of sorted)for(const r of a.responses)if(r.correct===false){
    const focus=focusFor(r.question);let group=groups.get(focus.key);
    if(!group){group={focus,events:[]};groups.set(focus.key,group);}
    group.events.push({at:a.completedAt,id:focus.source.id});
  }
  const out:WeeklyTopic[]=[];
  for(const [key,g] of groups){
    const recent=g.events.filter(e=>Date.parse(e.at)>=window.start), lastWrongAt=g.events.at(-1)!.at;
    const pending=state.plans.filter(p=>p.weekly?.topics.some(t=>t.key===key)&&!completed(state,p.id));
    const recentReview=sorted.some(a=>Date.parse(a.completedAt)>=window.start&&info(state,a)?.topics.some(t=>t.key===key));
    if(!recent.length&&!pending.length&&!recentReview)continue;
    const proofs=sorted.filter(a=>weeklyAttempt(state,a,key,'practice')&&a.completedAt>lastWrongAt&&passedRows(a,key));
    const practice=proofs.at(-1);
    const readyAt=practice?new Date(Date.parse(practice.completedAt)+REVIEW_DELAY_MS).toISOString():undefined;
    const verification=practice?sorted.filter(a=>{
      const meta=info(state,a),ref=meta?.topics.find(t=>t.key===key);
      return weeklyAttempt(state,a,key,'check')&&ref?.practiceId===practice.id&&a.completedAt>lastWrongAt&&Date.parse(a.startedAt)>=Date.parse(readyAt!)&&passedRows(a,key);
    }).at(-1):undefined;
    const sourceIds=[...new Set(g.events.map(e=>e.id))];
    const originalCorrected=sourceIds.every(id=>{
      const last=sorted.flatMap(a=>a.responses.filter(r=>!r.question.weekly&&r.question.id===id).map(r=>({r,at:a.completedAt}))).at(-1);
      return last?.r.correct===true;
    });
    const status:WeeklyStatus=!g.focus.supported?'unsupported':verification?'passed':!practice?'needs-practice':now.getTime()<Date.parse(readyAt!)?'waiting':'ready';
    const statusLabel=status==='unsupported'?'待补充同类题':status==='passed'?'本轮复测通过':status==='needs-practice'?(originalCorrected?'原题已订正，待同类练习':'仍需同类巩固'):status==='waiting'?'待隔日复测':'可以独立复测';
    out.push({...g.focus,errors:recent.length,sourceIds,lastWrongAt,originalCorrected,status,statusLabel,practice,verification,readyAt,pendingPractice:pending.find(p=>p.weekly?.stage==='practice'),pendingCheck:pending.find(p=>p.weekly?.stage==='check'&&p.weekly.topics.some(ref=>ref.key===key&&ref.practiceId===practice?.id&&ref.lastWrongAt===lastWrongAt))});
  }
  return out.sort((a,b)=>(a.status==='passed'?1:0)-(b.status==='passed'?1:0)||b.errors-a.errors||b.lastWrongAt.localeCompare(a.lastWrongAt));
}

const originalKeys:Record<number,string>={3000:'3-4',3001:'3-6',3002:'4-5',3003:'6-6',3010:'24-4',3011:'12-3',3012:'18-6',3013:'30-5',3020:'7-8',3021:'72-9',3022:'6-9',3023:'63-7',3030:'325',3031:'412',3032:'670',3040:'37+25',3041:'80-36',3042:'28+28',3043:'65-28',3050:'14/4',3051:'max-5',3052:'23/6',3053:'17/5'};
function usedSignatures(state:State):Set<string> {
  const set=new Set<string>();
  for(const p of state.plans)for(const q of p.questions){
    set.add(signature(q));const key=originalKeys[q.id];if(key)set.add(`${focusFor(q).key}:${key}`);
  }
  return set;
}
export function freshVariants(state:State,topic:WeeklyTopic,stage:'practice'|'check'):FamilyQuestion[] {
  const used=usedSignatures(state),raw=new Set<string>();
  for(const a of state.attempts)for(const r of a.responses)raw.add(`${r.question.question.replace(/\s+/g,'')}|${r.question.answer}`);
  return variants(topic,stage).filter(q=>!used.has(signature(q))&&!raw.has(`${q.question.replace(/\s+/g,'')}|${q.answer}`));
}
/** Two unseen items per focus, at most three focuses per short assignment. */
export function scheduleWeekly(state:State,stage:'practice'|'check',keys?:string[],now=new Date()):{state:State;plan:Plan} {
  const all=weeklyTopics(state,now),requested=keys?all.filter(t=>keys.includes(t.key)):all.filter(t=>t.supported&&t.status==='needs-practice').slice(0,3);
  if(!requested.length)throw new Error('当前没有需要安排的本周同类巩固题。');
  if(requested.length>3)throw new Error('每份先巩固 1–3 个知识点，完成后再安排下一组。');
  if(requested.some(t=>!t.supported))throw new Error('这道补充题还需要家长添加同类题，暂时不能自动复测。');
  if(stage==='check'&&requested.some(t=>!t.practice))throw new Error('先完成同类练习并全部答对，再安排隔日独立复测。');
  const existing=state.plans.find(p=>p.weekly?.stage===stage&&!completed(state,p.id)&&requested.every(t=>p.weekly!.topics.some(ref=>ref.key===t.key&&ref.lastWrongAt===t.lastWrongAt&&(stage==='practice'||ref.practiceId===t.practice?.id))));
  if(existing)return {state,plan:existing};
  const questions=requested.flatMap(t=>{
    const pool=freshVariants(state,t,stage);
    if(pool.length<2)throw new Error(`“${t.label}”的未见新题不足 2 道，需要补充题库；不会用做过的题判断掌握。`);
    // On poetry checks, include the originally missed line before another line.
    if(stage==='check'&&t.key.startsWith('poem:'))pool.sort((a,b)=>(b.answer===t.source.answer?1:0)-(a.answer===t.source.answer?1:0));
    return pool.slice(0,2);
  });
  const window=weekWindow(now),readyAt=stage==='check'?new Date(Math.max(...requested.map(t=>Date.parse(t.readyAt!)))).toISOString():now.toISOString();
  const weekly:WeeklyPlanInfo={stage,from:window.from,to:window.to,readyAt,topics:requested.map(t=>({key:t.key,label:t.label,subject:t.subject,sourceId:t.source.id,lastWrongAt:t.lastWrongAt,...(stage==='check'?{practiceId:t.practice!.id}:{})}))};
  const plan:Plan={...createPlan(stage==='practice'?'一周错题 · 同类巩固':'一周错题 · 隔日独立复测',localDate(new Date(Math.max(now.getTime(),Date.parse(readyAt)))),Math.max(4,questions.length),questions,'review'),weekly};
  return {state:{...state,plans:[...state.plans,plan]},plan};
}
export function weeklyAttemptLabel(a:Attempt):string {return a.weekly?.stage==='practice'?'同类巩固（逐题看讲解）':a.weekly?.stage==='check'?'独立复测（完成后看结果）':'';}
