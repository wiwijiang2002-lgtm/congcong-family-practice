import test from 'node:test';
import assert from 'node:assert/strict';
import { BANK, type FamilyQuestion } from './data';
import { advance, begin, check, createPlan, localDate, type State } from './domain';
import { addBank, emptyBankStore, type DraftQuestion, type LocalBank } from './local-bank';
import { suggestBankPractice } from './suggestions';

function draft(index: number, knowledge: string, subject: '语文' | '数学' = '语文'): DraftQuestion {
  return {
    subject,
    type: subject === '语文' ? 'fill_blank_text' : 'fill_blank',
    ...(subject === '语文' ? { mode: 'text' as const } : {}),
    question: `第 ${index} 道：${knowledge}`,
    answer: subject === '语文' ? `答案${index}` : String(index),
    options: [],
    knowledge_point: knowledge,
    explanation: '解析',
    unit: '测试单元',
  };
}

function bank(name: string, rows: DraftQuestion[], seed: number): LocalBank {
  return addBank(emptyBankStore(seed), { name, rows }).bank;
}

function addWrong(state: State, question: FamilyQuestion, completedAt?: Date): State {
  const plan = createPlan(`弱点 ${question.id}`, localDate(), 5, [question]);
  let next = begin({ ...state, plans: [...state.plans, plan] }, plan.id);
  next = check({ ...next, session: { ...next.session!, answer: '错误答案' } });
  next = advance(next);
  if (completedAt) next.attempts.at(-1)!.completedAt = completedAt.toISOString();
  return next;
}

const empty: State = { version: 1, plans: [], attempts: [], session: null };

test('A local-bank weak point suggests unused questions with the same knowledge point', () => {
  const source = bank('坐井观天题库', [
    draft(1, '坐井观天 · 看拼音写汉字'),
    draft(2, '坐井观天 · 看拼音写汉字'),
    draft(3, '坐井观天 · 看拼音写汉字'),
    draft(4, '坐井观天 · 看拼音写汉字'),
    draft(5, '第五单元 · 阅读'),
  ], 100);
  const state = addWrong(empty, source.questions[0]);
  const suggestions = suggestBankPractice(state, [source], new Date());
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].label, '坐井观天 · 看拼音写汉字');
  assert.equal(suggestions[0].questions.length, 3);
  assert.equal(suggestions[0].matched, 3);
  assert.ok(suggestions[0].questions.every(question => question.id !== source.questions[0].id));
  assert.ok(suggestions[0].questions.every(question => question.knowledge_point === '坐井观天 · 看拼音写汉字'));
  assert.equal(suggestions[0].bankNames[0], '坐井观天题库');
});

test('A built-in weakness can suggest local-bank questions tagged with the same math skill', () => {
  const source = bank('数学练习', [
    draft(1, '表内乘法', '数学'),
    draft(2, '表内乘法', '数学'),
    draft(3, '乘法口诀', '数学'),
    draft(4, '7～9表内乘除法', '数学'),
  ], 200);
  const wrong = BANK.find(question => question.id === 3003)!;
  const suggestions = suggestBankPractice(addWrong(empty, wrong), [source], new Date());
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].topic.key, 'math:mul-facts-small');
  assert.equal(suggestions[0].questions.length, 3);
  assert.ok(suggestions[0].questions.every(question => question.subject === '数学'));
  assert.equal(suggestions[0].matched, 3);
});

test('No banks, no recent mistakes and different subjects produce no suggestion questions', () => {
  const source = bank('语文题库', [draft(1, '坐井观天 · 看拼音写汉字')], 300);
  assert.deepEqual(suggestBankPractice(empty, [source], new Date()), []);
  const wrongChinese = addWrong(empty, source.questions[0]);
  const math = bank('数学题库', [draft(1, '表内乘法', '数学')], 301);
  const noMatch = suggestBankPractice(wrongChinese, [math], new Date());
  assert.equal(noMatch.length, 1);
  assert.equal(noMatch[0].questions.length, 0);
});

test('Suggestions exclude questions already assigned, and cap three topics at three questions each', () => {
  const rows = [
    draft(1, '知识点甲'), draft(2, '知识点甲'), draft(3, '知识点甲'), draft(4, '知识点甲'),
    draft(5, '知识点乙'), draft(6, '知识点乙'),
    draft(7, '知识点丙'), draft(8, '知识点丙'),
    draft(9, '知识点丁'), draft(10, '知识点丁'),
  ];
  const source = bank('多知识点题库', rows, 400);
  const base = Date.now();
  let state = empty;
  state = addWrong(state, source.questions[0], new Date(base - 1 * 60_000)); // 知识点甲, used, newest
  state = addWrong(state, source.questions[4], new Date(base - 3 * 60_000)); // 知识点乙
  state = addWrong(state, source.questions[6], new Date(base - 4 * 60_000)); // 知识点丙
  state = addWrong(state, source.questions[8], new Date(base - 5 * 60_000)); // 知识点丁, oldest
  const suggestions = suggestBankPractice(state, [source], new Date(), { perTopic: 3, maxTopics: 3 });
  assert.equal(suggestions.length, 3);
  assert.ok(suggestions.every(item => item.questions.length <= 3));
  assert.ok(suggestions.every(item => item.questions.every(question => !state.plans.some(plan => plan.questions.some(planned => planned.id === question.id)))));
  assert.ok(suggestions.some(item => item.label === '知识点甲'));
  assert.ok(!suggestions.some(item => item.label === '知识点丁'));
});

test('An unassigned but unused bank question is suggested; a question already in a plan is not', () => {
  const source = bank('去重题库', [draft(1, '知识点甲'), draft(2, '知识点甲')], 500);
  const state = addWrong(empty, source.questions[0]);
  const extraPlan = createPlan('已安排但未做', localDate(), 5, [source.questions[1]]);
  const withPlan = { ...state, plans: [...state.plans, extraPlan] };
  const suggestions = suggestBankPractice(withPlan, [source], new Date());
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].questions.length, 0);
  assert.equal(suggestions[0].matched, 0);
});

test('Untagged local questions are not matched to a vague unit-only weakness', () => {
  const source = bank('未标注题库', [draft(1, '本地题库'), draft(2, '本地题库')], 600);
  const state = addWrong(empty, source.questions[0]);
  const suggestions = suggestBankPractice(state, [source], new Date());
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].questions.length, 0);
});

test('Writing-only bank questions are not proposed as an auto-graded practice', () => {
  const wrongSource = bank('错题来源', [draft(1, '坐井观天 · 写话')], 700);
  const rows: DraftQuestion[] = [
    { ...draft(2, '坐井观天 · 写话'), mode: 'writing' as const },
    { ...draft(3, '坐井观天 · 写话'), mode: 'writing' as const },
  ];
  const source = bank('写话题库', rows, 701);
  const state = addWrong(empty, wrongSource.questions[0]);
  const suggestions = suggestBankPractice(state, [source], new Date());
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].questions.length, 0);
});
