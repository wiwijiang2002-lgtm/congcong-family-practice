import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addBank,
  bankFile,
  csvTemplate,
  decodeBankBytes,
  decodeBankStore,
  emptyBankStore,
  jsonTemplate,
  localCourses,
  parseBankText,
  type DraftQuestion,
} from './local-bank';
import { advance, begin, check, createPlan, localDate, type State } from './domain';
import { focusFor } from './weekly-questions';
import { scheduleWeekly, weeklyTopics } from './weekly';

const CSV = [
  '学科,题型,题干,答案,选项A,选项B,选项C,选项D,知识点,解析,单元',
  '语文,默写,"看拼音，写词语：chí táng",池塘,,,,,第一单元 · 词语,对照课本检查每个字。,第一单元',
  '数学,填空,3 个 4 相加是多少？,12,,,,,表内乘法,4 + 4 + 4 = 12。,第一单元',
  '语文,仿写,围绕“春天”写一句话。,春天来了，小草探出头。,,,,,写话,只记录原文，不判分。,第一单元',
].join('\r\n');

function draft(index: number, subject: DraftQuestion['subject'] = '数学'): DraftQuestion {
  return {
    subject,
    type: subject === '数学' ? 'fill_blank' : 'fill_blank_text',
    ...(subject === '语文' ? { mode: 'text' as const } : {}),
    question: `题目 ${index}`,
    answer: subject === '数学' ? String(index) : `答案${index}`,
    options: [],
    knowledge_point: '同一知识点',
    explanation: '解析',
    unit: '第一单元',
  };
}

test('CSV import: Chinese headers, quoted fields, all three supported types', () => {
  const result = parseBankText(CSV, '二上练习册.csv');
  assert.equal(result.rows.length, 3);
  assert.equal(result.issues.length, 0);
  assert.equal(result.rows[0].question, '看拼音，写词语：chí táng');
  assert.equal(result.rows[0].mode, 'dictation');
  assert.equal(result.rows[1].type, 'fill_blank');
  assert.equal(result.rows[2].mode, 'writing');
  assert.equal(result.name, '二上练习册');
});

test('Excel/TSV paste and quoted newlines survive', () => {
  const tsv = [
    '学科\t题型\t题干\t答案\t知识点',
    '语文\t填空\t"第一行\n第二行"\t答案\t知识点',
  ].join('\n');
  const result = parseBankText(tsv);
  assert.equal(result.rows.length, 1);
  assert.match(result.rows[0].question, /第一行\n第二行/);
  assert.equal(result.rows[0].mode, 'text');
});

test('Choice answers accept letters or exact option text, including three options', () => {
  const source = [
    '学科,题型,题干,答案,选项A,选项B,选项C,选项D',
    '数学,选择,每盒 6 支，3 盒共多少支？,18 支,A. 9 支,B. 18 支,C. 12 支,',
  ].join('\n');
  const result = parseBankText(source);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].answer, 'B');
  assert.equal(result.rows[0].options.length, 3);
});

test('Invalid rows are reported and skipped without losing valid rows', () => {
  const source = [
    '学科,题型,题干,答案,选项A,选项B,选项C,选项D',
    ',填空,缺少学科,1,,,,',
    '数学,填空,答案不是数字,12 支,,,,',
    '数学,仿写,科目不支持,示例,,,,',
    '数学,选择,答案不在选项里,D,A. 9,B. 18,,',
    '语文,填空,这是一道有效题,有效答案,,,,',
  ].join('\n');
  const result = parseBankText(source);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].answer, '有效答案');
  assert.equal(result.issues.length, 4);
  assert.ok(result.issues.some(issue => /学科/.test(issue.message)));
  assert.ok(result.issues.some(issue => /数字/.test(issue.message)));
  assert.ok(result.issues.some(issue => /默写和仿写/.test(issue.message)));
  assert.ok(result.issues.some(issue => /A\/B\/C\/D/.test(issue.message)));
});

test('Duplicate rows are imported once', () => {
  const result = parseBankText([
    '学科,题型,题干,答案',
    '语文,填空,同一道题,同一个答案',
    '语文,填空,同一道题,同一个答案',
  ].join('\n'));
  assert.equal(result.rows.length, 1);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0].message, /重复/);
});

test('JSON import reads name, note and option arrays', () => {
  const result = parseBankText(JSON.stringify({
    name: '练习册 JSON',
    note: '仅本机',
    questions: [
      { subject: '语文', type: '默写', question: '看拼音写词语', answer: '词语', unit: '第二单元' },
      { subject: '数学', type: '选择', question: '1 + 1 = ?', answer: 'B', options: ['A. 1', 'B. 2', 'C. 3'] },
    ],
  }));
  assert.equal(result.name, '练习册 JSON');
  assert.equal(result.note, '仅本机');
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[1].answer, 'B');

  const withBom = parseBankText('\uFEFF{"name":"BOM","questions":[{"subject":"语文","type":"填空","question":"题干","answer":"答案"}]}');
  assert.equal(withBom.rows.length, 1);
  assert.equal(withBom.name, 'BOM');
});

test('Saved banks get unique negative ids, local origin and a 12-question practice cap', () => {
  const rows = Array.from({ length: 14 }, (_, index) => draft(index + 1));
  const { store, bank } = addBank(emptyBankStore(500), { name: '单元练习', rows });
  assert.equal(bank.questions.length, 14);
  assert.equal(new Set(bank.questions.map(question => question.id)).size, 14);
  assert.ok(bank.questions.every(question => question.id < 0 && question.origin === 'local'));
  assert.ok(bank.questions.every(question => question.lessonId === `local-${bank.id}`));
  const courses = localCourses([bank]);
  assert.equal(courses.length, 1);
  assert.equal(courses[0].available, 14);
  assert.equal(courses[0].questions.length, 12);
  assert.equal(courses[0].bankId, bank.id);
  assert.equal(courses[0].edition, 'local');
});

test('Bank backup round-trips through the importer and store validator', () => {
  const parsed = parseBankText(CSV, '练习册.csv');
  const { store, bank } = addBank(emptyBankStore(900), { name: '备份测试', rows: parsed.rows });
  const decoded = decodeBankStore(JSON.stringify(store));
  assert.equal(decoded.banks.length, 1);
  assert.equal(decoded.banks[0].questions.length, parsed.rows.length);
  const again = parseBankText(bankFile(bank), 'backup.json');
  assert.equal(again.rows.length, parsed.rows.length);
  assert.equal(again.name, '备份测试');
  assert.equal(again.rows[2].mode, 'writing');
});

test('Corrupt or cross-bank local data is rejected instead of guessed', () => {
  const { store } = addBank(emptyBankStore(700), { name: '校验', rows: [draft(1)] });
  const badOrigin = structuredClone(store);
  badOrigin.banks[0].questions[0].origin = undefined;
  assert.throws(() => decodeBankStore(JSON.stringify(badOrigin)), /题目不完整/);
  const badLesson = structuredClone(store);
  badLesson.banks[0].questions[0].lessonId = 'local-someone-else';
  assert.throws(() => decodeBankStore(JSON.stringify(badLesson)), /题目不完整/);
  const badVersion = structuredClone(store);
  badVersion.version = 2 as unknown as 1;
  assert.throws(() => decodeBankStore(JSON.stringify(badVersion)), /格式不兼容/);
  const badCounter = structuredClone(store);
  badCounter.nextId = 1;
  assert.throws(() => decodeBankStore(JSON.stringify(badCounter)), /编号计数异常/);
  const badId = structuredClone(store);
  badId.banks[0].questions[0].id = 1;
  assert.throws(() => decodeBankStore(JSON.stringify(badId)), /题目不完整/);
});

test('Downloaded templates are self-authored and import without errors', () => {
  const csv = parseBankText(csvTemplate(), 'template.csv');
  assert.equal(csv.rows.length, 3);
  assert.equal(csv.issues.length, 0);
  const json = parseBankText(jsonTemplate(), 'template.json');
  assert.equal(json.rows.length, 2);
  assert.equal(json.issues.length, 0);
});

test('File bytes prefer UTF-8 and fall back to GBK for Chinese Excel CSV', () => {
  assert.equal(decodeBankBytes(new TextEncoder().encode('学科')), '学科');
  // GBK bytes for 学科, as saved by Excel on a Chinese Windows system.
  assert.equal(decodeBankBytes(new Uint8Array([0xD1, 0xA7, 0xBF, 0xC6])), '学科');
});

test('A wrong imported question stays visible but never claims automatic mastery', () => {
  const { bank } = addBank(emptyBankStore(300), { name: '本地错题', rows: [draft(7)] });
  const question = bank.questions[0];
  const plan = createPlan('本地练习', localDate(), 5, [question]);
  let state: State = begin({ version: 1, plans: [plan], attempts: [], session: null }, plan.id);
  state = advance(check({ ...state, session: { ...state.session!, answer: '错误答案' } }));
  const focus = focusFor(question);
  assert.equal(focus.supported, false);
  assert.match(focus.key, /^local:数学:/);
  const topics = weeklyTopics(state, new Date());
  assert.equal(topics.length, 1);
  assert.equal(topics[0].status, 'unsupported');
  assert.equal(topics[0].statusLabel, '待补充同类题');
  assert.throws(() => scheduleWeekly(state, 'practice', undefined, new Date()), /没有需要安排/);
});
