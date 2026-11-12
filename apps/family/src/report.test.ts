import test from 'node:test';
import assert from 'node:assert/strict';
import { learningReport } from './report';
import { BANK } from './data';
import type { Attempt } from './domain';

function sample(): Attempt {
  const choice=BANK.find(q=>q.type==='choice')!, writing=BANK.find(q=>q.mode==='writing')!;
  return {id:'private-record-id',planId:'private-plan-id',title:'语文与数学练习',date:'2026-11-12',startedAt:'2026-11-12T01:00:00Z',completedAt:'2026-11-12T01:05:00Z',score:0,total:10,responses:[{question:choice,answer:'A',correct:false},{question:writing,answer:'白云像一只绵羊。',correct:null}]};
}
test('Export is a readable offline Chinese report with scores, answers and writing separated',()=>{
  const a=sample();const {filename,html}=learningReport([a],new Date(2026,10,12));
  assert.equal(filename,'聪聪学堂-本次学习报告-2026-11-12.html');
  for(const text of ['<!doctype html>','<html lang="zh-CN">','打印 / 另存为 PDF','语文与数学练习','白云像一只绵羊。','客观题共 1 道，答对 0 道','仿写 · 待家长交流',a.responses[0].question.options[0]]) assert.ok(html.includes(text),text);
  assert.ok(!html.includes('private-record-id'));assert.ok(!html.includes('private-plan-id'));assert.ok(!html.includes('src="http'));
});
test('User-entered titles, answers, options and explanations cannot inject HTML or scripts',()=>{
  const a=sample();a.title='<script>alert(1)</script>';a.responses[0].answer='<img src=x onerror=alert(1)>';a.responses[0].question={...a.responses[0].question,options:['<svg onload=alert(2)>'],explanation:'A & B < C'};
  const {html}=learningReport([a]);
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('<svg'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert.ok(html.includes('A &amp; B &lt; C'));
});
test('All-results report sorts records without mutating source and rejects empty exports',()=>{
  const first=sample(),second={...sample(),title:'较晚的练习',completedAt:'2026-11-13T01:05:00Z'};
  const input=[first,second];const {html}=learningReport(input);
  assert.ok(html.indexOf('较晚的练习')<html.indexOf(first.title));assert.equal(input[0],first);
  assert.ok(html.includes('客观题共 2 道'));assert.throws(()=>learningReport([]),/完成一份练习/);
});
