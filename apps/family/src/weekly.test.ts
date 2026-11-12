import test from 'node:test';
import assert from 'node:assert/strict';
import { BANK, type FamilyQuestion } from './data';
import { begin, check, advance, createPlan, decode, localDate, type State, type Plan } from './domain';
import { freshVariants, REVIEW_DELAY_MS, scheduleWeekly, weeklyTopics, weekWindow } from './weekly';
import { focusFor, signature, variants } from './weekly-questions';
import { weeklyLearningReport } from './report';
const date=(s:string)=>new Date(s);
const now=date('2026-11-12T10:00:00+08:00');
const empty=():State=>({version:1,plans:[],attempts:[],session:null});
const q=(id:number)=>BANK.find(q=>q.id===id)!;
function finish(s:State,p:Plan,at:Date,wrong:number[]=[]):State {
  let next=begin(s,p.id,at);
  p.questions.forEach((question,i)=>{
    const answer=wrong.includes(i)?question.type==='choice'?(question.answer==='A'?'B':'A'):'错99999':question.mode==='writing'?'我的仿写。':question.answer;
    next=advance(check({...next,session:{...next.session!,answer}}));
  });
  next.attempts.at(-1)!.completedAt=at.toISOString();
  return next;
}
function errorState(ids=[3003],at=date('2026-11-11T09:00:00+08:00')):State {
  const p=createPlan('原练习',localDate(at),5,ids.map(q));
  return finish({...empty(),plans:[p]},p,at,ids.map((_,i)=>i));
}
function practice(s=errorState(),at=now):State {
  const result=scheduleWeekly(s,'practice',undefined,at);
  return finish(result.state,result.plan,at);
}

test('Week uses seven local calendar days including today, and excludes future records',()=>{
  // Calendar boundaries use the device timezone, including when CI runs in UTC.
  const localNow=new Date(2026,10,12,10);
  const w=weekWindow(localNow);assert.equal(w.from,'2026-11-06');assert.equal(w.to,'2026-11-12');
  assert.equal(weeklyTopics(errorState([3003],new Date(2026,10,5,23,59)),localNow).length,0);
  assert.equal(weeklyTopics(errorState([3003],new Date(2026,10,6,0,1)),localNow).length,1);
  assert.equal(weeklyTopics(errorState([3003],new Date(2026,10,13,0,1)),localNow).length,0);
});
test('Repeated mistakes group by specific skill, not merely by subject or unit',()=>{
  const topics=weeklyTopics(errorState([3041,3043,3040]),now);
  assert.equal(topics.length,2);assert.equal(topics.find(t=>t.key==='math:sub-borrow')!.errors,2);
  assert.equal(topics.find(t=>t.key==='math:add-carry')!.errors,1);
});
test('Correcting the identical original does not count as passing unseen variants',()=>{
  let s=errorState();const p=createPlan('订正原题',localDate(now),5,[q(3003)],'review');s=finish({...s,plans:[...s.plans,p]},p,now);
  const t=weeklyTopics(s,now)[0];assert.equal(t.originalCorrected,true);assert.equal(t.status,'needs-practice');assert.match(t.statusLabel,/待同类/);
});
test('New assignments use two unique variants per skill and deduplicate pending schedules',()=>{
  const s=errorState(),result=scheduleWeekly(s,'practice',undefined,now),again=scheduleWeekly(result.state,'practice',undefined,now);
  assert.equal(result.plan.questions.length,2);assert.equal(new Set(result.plan.questions.map(signature)).size,2);
  assert.ok(result.plan.questions.every(x=>x.id!==3003&&x.weekly?.stage==='practice'));
  assert.equal(again.plan.id,result.plan.id);assert.equal(again.state.plans.length,result.state.plans.length);
});
test('Practicing correctly remains waiting; check is locked until at least 24 hours later',()=>{
  const s=practice();const t=weeklyTopics(s,now)[0];assert.equal(t.status,'waiting');
  const scheduled=scheduleWeekly(s,'check',[t.key],now);assert.equal(Date.parse(scheduled.plan.weekly!.readyAt)-now.getTime(),REVIEW_DELAY_MS);
  assert.throws(()=>begin(scheduled.state,scheduled.plan.id,new Date(now.getTime()+REVIEW_DELAY_MS-1)),/未开放/);
  assert.deepEqual(decode(JSON.stringify(scheduled.state)),scheduled.state);
});
test('Delayed check uses unseen disjoint variants and two correct answers mark this round passed',()=>{
  let s=practice();const key=weeklyTopics(s,now)[0].key;const result=scheduleWeekly(s,'check',[key],now);
  const learned=new Set(s.plans.at(-1)!.questions.map(signature));assert.ok(result.plan.questions.every(x=>!learned.has(signature(x))));
  const later=new Date(now.getTime()+REVIEW_DELAY_MS+60000);s=finish(result.state,result.plan,later);
  const t=weeklyTopics(s,later)[0];assert.equal(t.status,'passed');assert.equal(t.statusLabel,'本轮复测通过');
  assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('An all-correct check done too early cannot establish mastery',()=>{
  const s=practice(),key=weeklyTopics(s,now)[0].key,scheduled=scheduleWeekly(s,'check',[key],now);
  const forged={...scheduled.state,attempts:[...s.attempts,{id:'early',planId:scheduled.plan.id,title:'early',date:localDate(now),startedAt:now.toISOString(),completedAt:new Date(now.getTime()+60000).toISOString(),score:20,total:20,weekly:scheduled.plan.weekly,responses:scheduled.plan.questions.map(question=>({question,answer:question.answer,correct:true}))}]};
  assert.notEqual(weeklyTopics(forged,new Date(now.getTime()+120000))[0].status,'passed');
});
test('Failed independent check resets the skill and next practice uses other new items',()=>{
  const s=practice(),key=weeklyTopics(s,now)[0].key,result=scheduleWeekly(s,'check',[key],now),later=new Date(now.getTime()+REVIEW_DELAY_MS+1000);
  const failed=finish(result.state,result.plan,later,[1]);assert.equal(weeklyTopics(failed,later)[0].status,'needs-practice');
  const next=scheduleWeekly(failed,'practice',[key],new Date(later.getTime()+1000));
  const old=new Set(failed.plans.flatMap(p=>p.questions.map(signature)));assert.ok(next.plan.questions.every(x=>!old.has(signature(x))));
});
test('A new mistake invalidates earlier success and stale scheduled checks cannot be started',()=>{
  const s=practice(),key=weeklyTopics(s,now)[0].key,result=scheduleWeekly(s,'check',[key],now);
  const later=new Date(now.getTime()+2*60*60*1000),p=createPlan('又错一次',localDate(later),4,[q(3002)]);
  const failed=finish({...result.state,plans:[...result.state.plans,p]},p,later,[0]);
  assert.equal(weeklyTopics(failed,later)[0].status,'needs-practice');
  assert.throws(()=>begin(failed,result.plan.id,new Date(now.getTime()+REVIEW_DELAY_MS+1000)),/重新完成/);
});
test('Every built-in graded item maps to supported focus with enough practice and check variants',()=>{
  const graded=BANK.filter(q=>q.mode!=='writing');
  for(const item of graded){const focus=focusFor(item);assert.ok(focus.supported,`${item.id} ${focus.label}`);assert.ok(variants(focus,'practice').length>=2,focus.key);assert.ok(variants(focus,'check').length>=2,focus.key);}
});
test('Character fill errors focus on the full target word; poetry focuses on that poem',()=>{
  assert.equal(focusFor(q(2103)).key,'word:白日');assert.equal(focusFor(q(2104)).key,'poem:登鹳雀楼');
  for(const stage of ['practice','check'] as const){const items=variants(focusFor(q(2104)),stage);assert.ok(items.every(x=>x.answer.length>0));}
});
test('Unsupported custom items are visible but cannot be marked as mastered or get fabricated variants',()=>{
  const custom:FamilyQuestion={...q(2101),id:90000001,answer:'自定义片段甲乙丙',knowledge_point:'家长补充'};
  const p=createPlan('补充题',localDate(now),5,[custom]);const s=finish({...empty(),plans:[p]},p,now,[0]);
  const t=weeklyTopics(s,now)[0];assert.equal(t.status,'unsupported');assert.throws(()=>scheduleWeekly(s,'practice',[t.key],now),/添加同类题/);
});
test('When unseen variants are exhausted the app requests more items instead of reusing answered items',()=>{
  const s=errorState([2101]),t=weeklyTopics(s,now)[0],pool=variants(t,'practice');
  const p={...createPlan('预留全部新题',localDate(now),5,pool,'review'),weekly:undefined};
  const used={...s,plans:[...s.plans,p]};assert.equal(freshVariants(used,t,'practice').length,0);assert.throws(()=>scheduleWeekly(used,'practice',[t.key],now),/新题不足/);
});
test('Pending delayed check carries over even after the original mistake leaves the seven-day window',()=>{
  const original=errorState([3003],date('2026-11-06T09:00:00+08:00')),s=practice(original,now),key=weeklyTopics(s,now)[0].key;
  const result=scheduleWeekly(s,'check',[key],now),later=date('2026-11-14T10:00:00+08:00');
  const t=weeklyTopics(result.state,later)[0];assert.equal(t.errors,0);assert.equal(t.status,'ready');assert.ok(t.pendingCheck);
});
test('Multi-skill practice requires both items correct separately for each focus',()=>{
  const s=errorState([3003,3041]),result=scheduleWeekly(s,'practice',undefined,now),done=finish(result.state,result.plan,now,[3]);
  const topics=weeklyTopics(done,now);assert.equal(topics.filter(t=>t.status==='waiting').length,1);assert.equal(topics.filter(t=>t.status==='needs-practice').length,1);
});
test('Weekly readable report includes progress, interval rule and original/variant answers',()=>{
  const s=practice();const report=weeklyLearningReport(s,now);
  assert.match(report.filename,/一周错题巩固报告/);for(const text of ['一周巩固进度','至少间隔 24 小时','待隔日复测','同类巩固（逐题看讲解）','错误']){
    if(text!=='错误')assert.ok(report.html.includes(text),text);
  }
});
test('Malformed weekly metadata is rejected without breaking old saved data',()=>{
  const old=errorState();assert.deepEqual(decode(JSON.stringify(old)),old);
  const scheduled=scheduleWeekly(old,'practice',undefined,now),bad=structuredClone(scheduled.state);bad.plans.at(-1)!.weekly!.topics=[];
  assert.throws(()=>decode(JSON.stringify(bad)),/一周巩固/);
});
test('New multiplication variants stay near the missed table and choice answers do not share one fixed letter',()=>{
  const s=errorState([3003]),result=scheduleWeekly(s,'practice',undefined,now);
  assert.ok(result.plan.questions.every(x=>x.question.includes('6 ×')));
  const pool=variants(focusFor(q(3003)),'practice').filter(x=>x.type==='choice');
  assert.ok(new Set(pool.map(x=>x.answer)).size>1);
});
test('Every generated math answer and set of options agrees with independent arithmetic',()=>{
  const seen=new Set<string>();
  for(const source of BANK.filter(q=>q.subject==='数学'))for(const stage of ['practice','check'] as const){
    const focus=focusFor(source);
    for(const item of variants(focus,stage)){
      const sig=item.weekly!.signature;if(seen.has(sig))continue;seen.add(sig);
      const skill=focus.key.slice(5),tail=sig.split(':').at(-1)!;
      let expected:number|undefined;
      if(skill.startsWith('mul-')){const [a,b]=tail.split('-').map(Number);expected=a*b;}
      else if(skill.startsWith('div-')){const [a,b]=tail.split('-').map(Number);expected=a/b;}
      else if(skill==='add-carry'){const[a,b]=tail.split('+').map(Number);expected=a+b;}
      else if(skill==='sub-borrow'){const[a,b]=tail.split('-').map(Number);expected=a-b;}
      else if(skill==='remainder'||skill==='full-groups'){const[n,d]=tail.split('/').map(Number);expected=skill==='remainder'?n%d:Math.floor(n/d);}
      else if(skill==='remainder-rule'){const[k,d]=tail.split('-');expected=k==='max'?Number(d)-1:Number(d);}
      else if(skill==='place-digit')expected=Math.floor(Number(tail)/10)%10;
      else if(skill==='place-compose'||skill==='number-between')expected=Number(tail);
      if(expected===undefined)continue;
      const actual=item.type==='choice'?Number(item.options[item.answer.charCodeAt(0)-65].replace(/^[A-D]\.\s*/,'')):Number(item.answer);
      assert.equal(actual,expected,sig);
      if(item.type==='choice'){assert.equal(new Set(item.options.map(o=>o.replace(/^[A-D]\.\s*/,''))).size,4,sig);}
    }
  }
  assert.ok(seen.size>200);
});
test('Swapping multiplication operands does not create a second supposedly unseen item',()=>{
  const s=errorState([3002]),learn=scheduleWeekly(s,'practice',undefined,now),done=finish(learn.state,learn.plan,now),key=weeklyTopics(done,now)[0].key,checkPlan=scheduleWeekly(done,'check',[key],now).plan;
  const all=[...learn.plan.questions,...checkPlan.questions];
  assert.equal(new Set(all.map(signature)).size,4);
  const pairs=all.map(q=>q.question.match(/\d+/g)!.map(Number).slice(0,2).sort((a,b)=>a-b).join('-'));
  assert.equal(new Set(pairs).size,4);
  assert.ok(all.every(q=>q.question.includes('4 ×')));
});
