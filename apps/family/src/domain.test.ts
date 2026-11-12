import test from 'node:test';
import assert from 'node:assert/strict';
import { BANK, COURSES } from './data';
import { initialState, createPlan, localDate, begin, check, advance, grade, mistakes, decode, type State } from './domain';
const text = BANK.find(q=>q.subject==='语文'&&q.mode==='dictation')!;
const choice = BANK.find(q=>q.type==='choice')!;
const math = BANK.find(q=>q.type==='fill_blank')!;
const writing = BANK.find(q=>q.mode==='writing')!;
function answer(s: State, value: string): State { return check({...s,session:{...s.session!,answer:value}}); }
function one(q=math): State { const p=createPlan('测试练习',localDate(),5,[q]); return begin({version:1,plans:[p],attempts:[],session:null},p.id); }

test('Chinese: punctuation and spacing normalize, wrong characters do not',()=>{
  assert.equal(grade(text,` ${text.answer.split('').join(' ')}。 `),true);
  assert.equal(grade(text,'完全不同'),false); assert.equal(grade(text,'  '),false);
});
test('Choice: fullwidth lowercase and whitespace accepted, arbitrary text rejected',()=>{
  assert.equal(grade(choice,choice.answer.toLowerCase()),true);
  assert.equal(grade(choice,String.fromCharCode(choice.answer.charCodeAt(0)+0xfee0)),true);
  assert.equal(grade(choice,'AB'),false);
});
test('Numbers: fullwidth, decimals and equivalent fractions accepted',()=>{
  const q={...math,answer:'3/4'};
  assert.equal(grade(q,'0.75'),true); assert.equal(grade(q,'6/8'),true);
  assert.equal(grade({...q,answer:'6'},'６'),true);
  assert.equal(grade({...q,answer:'6'},'6.0'),true);
});
test('Numbers: unequal fractions, incomplete numbers and zero denominators rejected',()=>{
  const q={...math,answer:'3/4'};
  for(const value of ['3/5','3/0','3abc','3/','0.75米','0.75+1','NaN','Infinity','']) assert.equal(grade(q,value),false,value);
});
test('Any later lesson can start without completing the first lesson',()=>{
  const c=COURSES.filter(c=>c.edition==='tongbian-2026').at(-1)!;
  assert.equal(c.title,'快乐的小河');
  const p=createPlan(c.title,localDate(),8,c.questions);
  const s=begin({version:1,plans:[p],attempts:[],session:null},p.id);
  assert.equal(s.session?.planId,p.id); assert.equal(s.attempts.length,0);
});
test('Local dates use local calendar day rather than UTC date',()=>{
  assert.equal(localDate(new Date(2026,10,12,0,15)),'2026-11-12');
});
test('Question snapshots are isolated from subsequent question-bank edits',()=>{
  const original={...math};const p=createPlan('快照',localDate(),5,[original]);original.question='changed';
  assert.notEqual(p.questions[0].question,'changed');
});
test('Checking twice cannot append a second response or alter the first answer',()=>{
  const s=answer(one(),math.answer); assert.equal(check(s),s); assert.equal(s.session?.responses.length,1);
});
test('Blank answers and concurrent second sessions are rejected',()=>{
  const s=one(); assert.throws(()=>check(s),/答案/);
  const p=createPlan('另一份',localDate(),5,[math]);assert.throws(()=>begin({...s,plans:[...s.plans,p]},p.id),/进行中/);
});
test('Final submission is durable and idempotent, one result per assignment',()=>{
  const s=advance(answer(one(),math.answer));assert.equal(s.attempts.length,1);assert.equal(s.attempts[0].score,10);assert.equal(s.session,null);
  assert.equal(advance(s),s);assert.throws(()=>begin(s,s.plans[0].id),/完成/);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('Resume a checked question after serializing, then complete the practice',()=>{
  const s=answer(one(),math.answer);const restored=decode(JSON.stringify(s));assert.equal(restored.session?.responses.length,1);
  assert.equal(advance(restored).attempts.length,1);
});
test('Writing is recorded with null grade, excluded from score and mistakes',()=>{
  const p=createPlan('带仿写',localDate(),5,[math,writing]);let s=begin({version:1,plans:[p],attempts:[],session:null},p.id);
  s=advance(answer(s,math.answer));s=answer(s,'树叶像一只小船。');assert.equal(s.session?.responses[1].correct,null);s=advance(s);
  assert.equal(s.attempts[0].score,10);assert.equal(s.attempts[0].total,10);assert.equal(mistakes(s).length,0);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('Mistake review removes a question only after a later correct attempt',()=>{
  let s=advance(answer(one(),'99999'));assert.equal(mistakes(s).length,1);
  const p=createPlan('错题复习',localDate(),3,[math],'review');s=begin({...s,plans:[...s.plans,p]},p.id);s=advance(answer(s,math.answer));assert.equal(mistakes(s).length,0);assert.equal(s.attempts[0].responses[0].correct,false);
});
test('Incomplete, incompatible and corrupt stored states are rejected',()=>{
  assert.throws(()=>decode('{'));assert.throws(()=>decode('{}'));assert.throws(()=>decode(JSON.stringify({...initialState(),version:2})));
  const good=advance(answer(one(),math.answer));const bad=structuredClone(good);bad.attempts[0].score=999;assert.throws(()=>decode(JSON.stringify(bad)));
  const draft=one();draft.session!.index=500;assert.throws(()=>decode(JSON.stringify(draft)));
});
test('Every catalog lesson has original practice; Chinese includes a writing activity',()=>{
  assert.equal(COURSES.filter(c=>c.edition==='tongbian-2026').length,29);
  assert.equal(COURSES.filter(c=>c.edition==='sujiao-math').length,6);
  assert.equal(new Set(BANK.map(q=>q.id)).size,BANK.length);
  for(const c of COURSES){assert.ok(c.questions.length>=4);assert.ok(c.expansion);if(c.subject==='语文') assert.ok(c.questions.some(q=>q.mode==='writing'));}
});
test('Assignments enforce maximum size and require an objectively graded item',()=>{
  assert.throws(()=>createPlan('',localDate(),5,[math]));assert.throws(()=>createPlan('too many',localDate(),5,BANK.slice(0,13)));
  assert.throws(()=>createPlan('only writing',localDate(),5,[writing]));assert.throws(()=>createPlan('bad date','not-a-date',5,[math]));
});
