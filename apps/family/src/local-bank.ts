import { type Course, type FamilyQuestion } from './data';
import { isNumericAnswer, uid, validQuestion } from './domain';

/**
 * Parent-imported workbook questions.
 *
 * Questions and answers live in localStorage only. Nothing here sends data to a
 * server, and no real workbook content belongs in this repository.
 */
export const LOCAL_BANK_KEY = 'congcong-family-local-bank:v1';
export const MAX_BANK_QUESTIONS = 3000;
export const MAX_TOTAL_QUESTIONS = 5000;
export const MAX_IMPORT_BYTES = 2_000_000;

export type DraftMode = 'dictation' | 'text' | 'writing';
export interface DraftQuestion {
  subject: '语文' | '数学';
  type: 'choice' | 'fill_blank' | 'fill_blank_text';
  mode?: DraftMode;
  question: string;
  answer: string;
  options: string[];
  knowledge_point: string;
  explanation: string;
  unit: string;
}
export interface ImportIssue { line: number; message: string }
export interface ParseResult {
  name: string;
  note: string;
  rows: DraftQuestion[];
  issues: ImportIssue[];
}
export interface LocalBank {
  version: 1;
  id: string;
  name: string;
  note: string;
  importedAt: string;
  questions: FamilyQuestion[];
}
export interface LocalBankStore {
  version: 1;
  nextId: number;
  banks: LocalBank[];
}

type Field = 'subject' | 'type' | 'question' | 'answer' | 'options' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'knowledge_point' | 'explanation' | 'unit' | 'mode';
type RawValues = Partial<Record<Field, string | string[]>>;

const normalizeKey = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/[\s_*·:：]/g, '');

const FIELD_ALIASES = new Map<string, Field>();
function alias(field: Field, names: string[]) {
  for (const name of names) FIELD_ALIASES.set(normalizeKey(name), field);
}
alias('subject', ['学科', '科目', 'subject']);
alias('type', ['题型', '类型', 'type']);
alias('question', ['题干', '题目', '问题', 'question']);
alias('answer', ['答案', '参考答案', 'answer']);
alias('options', ['选项', 'options']);
alias('optionA', ['选项a', '选项1', 'a', 'optiona', 'option1']);
alias('optionB', ['选项b', '选项2', 'b', 'optionb', 'option2']);
alias('optionC', ['选项c', '选项3', 'c', 'optionc', 'option3']);
alias('optionD', ['选项d', '选项4', 'd', 'optiond', 'option4']);
alias('knowledge_point', ['知识点', '考点', 'knowledgepoint', 'knowledge_point']);
alias('explanation', ['解析', '讲解', '说明', 'explanation']);
alias('unit', ['单元', '课', '课文', '章节', 'unit']);
alias('mode', ['作答方式', '模式', 'mode']);

const TYPE_ALIASES = new Map<string, 'choice' | 'fill_blank' | 'fill_blank_text' | 'dictation' | 'writing'>();
for (const [key, value] of Object.entries({
  choice: 'choice', 选择: 'choice', 选择题: 'choice', 单选: 'choice', 单项选择: 'choice',
  fill_blank: 'fill_blank', 填空: 'fill_blank', 填空题: 'fill_blank', 计算: 'fill_blank', 计算题: 'fill_blank',
  fill_blank_text: 'fill_blank_text', 文字填空: 'fill_blank_text',
  dictation: 'dictation', 默写: 'dictation', 看拼音写词语: 'dictation', 听写: 'dictation',
  writing: 'writing', 仿写: 'writing', 写话: 'writing', 习作: 'writing', 作文: 'writing',
} as const)) TYPE_ALIASES.set(normalizeKey(key), value);

const MODE_ALIASES = new Map<string, DraftMode>();
for (const [key, value] of Object.entries({
  dictation: 'dictation', 默写: 'dictation', text: 'text', 填写: 'text', 文字: 'text', writing: 'writing', 仿写: 'writing', 写话: 'writing',
} as const)) MODE_ALIASES.set(normalizeKey(key), value);

function cell(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

function objectValues(input: Record<string, unknown>): RawValues {
  const out: RawValues = {};
  for (const [key, value] of Object.entries(input)) {
    const field = FIELD_ALIASES.get(normalizeKey(key));
    if (!field) continue;
    if (field === 'options' && Array.isArray(value)) out.options = value.map(item => cell(item)).filter(Boolean);
    else if (field !== 'options') out[field] = cell(value);
  }
  return out;
}

function text(raw: RawValues, field: Field): string {
  const value = raw[field];
  return typeof value === 'string' ? value.trim() : '';
}

function oneLine(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
}

function choiceLetter(answer: string, options: string[]): string | null {
  const direct = /^([A-Da-d])(?:[.、．)）:：\s].*)?$/.exec(answer.trim());
  if (direct) {
    const index = direct[1].toUpperCase().charCodeAt(0) - 65;
    if (index < options.length) return String.fromCharCode(65 + index);
  }
  const norm = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, '');
  const strip = (value: string) => value.replace(/^[A-Da-d][.、．)）:：\s]*/, '');
  let index = options.findIndex(option => norm(option) === norm(answer));
  if (index < 0) index = options.findIndex(option => norm(strip(option)) === norm(strip(answer)));
  return index >= 0 ? String.fromCharCode(65 + index) : null;
}

function buildRow(raw: RawValues, line: number, rowLabel: string): { row?: DraftQuestion; issue?: ImportIssue; signature?: string } {
  const issue = (message: string) => ({ issue: { line, message: `第 ${line} ${rowLabel}：${message}` } });
  const subjectText = normalizeKey(text(raw, 'subject'));
  const subject = ['语文', 'chinese', 'yuwen', 'chn'].includes(subjectText) ? '语文' : ['数学', 'math', 'shuxue', 'mathematics'].includes(subjectText) ? '数学' : null;
  if (!subject) return issue('缺少学科，请填“语文”或“数学”。');

  const typeText = normalizeKey(text(raw, 'type'));
  let kind = TYPE_ALIASES.get(typeText);
  if (!kind) return issue('题型不认识，请填“选择 / 填空 / 默写 / 仿写”。');

  const question = oneLine(text(raw, 'question'));
  const answer = oneLine(text(raw, 'answer'));
  if (!question) return issue('缺少题干。');
  if (!answer) return issue('缺少答案。');
  if (question.length > 800) return issue('题干超过 800 字，请拆成多道题。');
  if (answer.length > 500) return issue('答案超过 500 字。');

  let mode: DraftMode | undefined;
  let declared = false;
  const declaredMode = text(raw, 'mode');
  if (declaredMode) {
    const mapped = MODE_ALIASES.get(normalizeKey(declaredMode));
    if (!mapped) return issue('作答方式只支持“默写 / 填写 / 仿写”。');
    if (kind === 'choice') return issue('选择题不能设置文字作答方式。');
    if (subject !== '语文') return issue('只有语文题可以使用文字作答方式。');
    mode = mapped;
    kind = 'fill_blank_text';
    declared = true;
  }

  let options: string[] = [];
  if (kind === 'choice') {
    options = Array.isArray(raw.options) ? raw.options.map(item => oneLine(item)).filter(Boolean) : [];
    if (!options.length) options = (['optionA', 'optionB', 'optionC', 'optionD'] as const).map(field => oneLine(text(raw, field))).filter(Boolean);
    if (options.length < 2 || options.length > 4) return issue(`选择题需要 2–4 个选项，当前有 ${options.length} 个。`);
    if (options.some(option => option.length > 200)) return issue('选项超过 200 字。');
    if (new Set(options.map(option => normalizeKey(option))).size !== options.length) return issue('选项内容有重复。');
    const letter = choiceLetter(answer, options);
    if (!letter) return issue('选择题答案请填 A/B/C/D，或与某个选项文字完全一致。');
    return finish(subject, kind, mode, question, letter, options, raw, line, rowLabel);
  }

  if (!declared) {
    if (kind === 'dictation' || kind === 'writing') {
      if (subject !== '语文') return issue('默写和仿写只支持语文题。');
      mode = kind;
      kind = 'fill_blank_text';
    } else if (kind === 'fill_blank_text') {
      if (subject !== '语文') return issue('数学填空请使用“填空”，答案填写数字。');
      mode = 'text';
    } else if (subject === '语文') {
      kind = 'fill_blank_text';
      mode = 'text';
    } else if (!isNumericAnswer(answer)) {
      return issue('数学填空题的答案需要是数字（可写 12、3/4 等），否则无法自动判分。');
    }
  } else if (kind === 'fill_blank_text' && subject !== '语文') {
    return issue('数学填空请使用“填空”，答案填写数字。');
  }
  if (kind !== 'fill_blank' && kind !== 'fill_blank_text') return issue('题型处理失败，请检查题型和作答方式。');
  return finish(subject, kind, mode, question, answer, options, raw, line, rowLabel);
}

function finish(subject: '语文' | '数学', type: DraftQuestion['type'], mode: DraftMode | undefined, question: string, answer: string, options: string[], raw: RawValues, line: number, rowLabel: string) {
  const unit = oneLine(text(raw, 'unit'));
  if (unit.length > 40) return { issue: { line, message: `第 ${line} ${rowLabel}：单元名称超过 40 字。` } };
  const knowledge = oneLine(text(raw, 'knowledge_point')) || unit || '本地题库';
  if (knowledge.length > 80) return { issue: { line, message: `第 ${line} ${rowLabel}：知识点超过 80 字。` } };
  const explanation = oneLine(text(raw, 'explanation')) || '请对照参考答案检查。';
  if (explanation.length > 1000) return { issue: { line, message: `第 ${line} ${rowLabel}：解析超过 1000 字。` } };
  const signature = [subject, type, mode ?? '', question, answer, ...options]
    .map(value => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ''))
    .join('|');
  return { row: { subject, type, mode, question, answer, options, knowledge_point: knowledge, explanation, unit }, signature };
}

interface RawTableRow { cells: string[]; line: number }

function detectDelimiter(header: string): string {
  let tab = 0, comma = 0, semicolon = 0, quoted = false;
  for (const ch of header) {
    if (ch === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (ch === '\t') tab++;
    else if (ch === ',') comma++;
    else if (ch === ';') semicolon++;
  }
  if (tab > 0 && tab >= comma && tab >= semicolon) return '\t';
  return semicolon > comma ? ';' : ',';
}

/** Minimal RFC-4180 parser; also accepts Excel/TSV paste. */
export function parseDelimited(text: string): RawTableRow[] {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/).find(line => line.trim()) ?? '';
  const delimiter = detectDelimiter(firstLine);
  const rows: RawTableRow[] = [];
  let cells: string[] = [], field = '', quoted = false, line = 1, rowLine = 1;
  const pushField = () => { cells.push(field); field = ''; };
  const pushRow = () => {
    cells.push(field); field = '';
    if (cells.some(value => value.trim() !== '')) rows.push({ cells, line: rowLine });
    cells = [];
  };
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else if (ch === '\r' && clean[i + 1] === '\n') {
        // Normalize CRLF inside a quoted cell to a plain newline.
        continue;
      } else {
        if (ch === '\n') line++;
        field += ch;
      }
      continue;
    }
    if (ch === '"' && field.trim() === '') { field = ''; quoted = true; continue; }
    if (ch === delimiter) { pushField(); continue; }
    if (ch === '\r') {
      if (clean[i + 1] === '\n') continue;
      pushRow(); line++; rowLine = line; continue;
    }
    if (ch === '\n') { pushRow(); line++; rowLine = line; continue; }
    field += ch;
  }
  if (field.length || cells.length) pushRow();
  return rows;
}

function filenameName(filename?: string): string {
  if (!filename) return '我的本地题库';
  const base = filename.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return base.slice(0, 40) || '我的本地题库';
}

function collect(rows: DraftQuestion[], issues: ImportIssue[], seen: Map<string, number>, built: { row?: DraftQuestion; issue?: ImportIssue; signature?: string }, line: number) {
  if (built.issue) { issues.push(built.issue); return; }
  if (!built.row || !built.signature) return;
  const previous = seen.get(built.signature);
  if (previous !== undefined) { issues.push({ line, message: `第 ${line} 题与前面的第 ${previous} 题重复，已跳过。` }); return; }
  seen.set(built.signature, line);
  rows.push(built.row);
}

function parseDelimitedBank(source: string, name: string, issues: ImportIssue[]): DraftQuestion[] {
  const table = parseDelimited(source);
  if (table.length < 2) { issues.push({ line: 0, message: '至少需要一行表头和一行题目。' }); return []; }
  const header = table[0].cells.map(value => FIELD_ALIASES.get(normalizeKey(value)));
  const missing = (['subject', 'type', 'question', 'answer'] as const).filter(field => !header.includes(field));
  if (missing.length) {
    const labels: Record<string, string> = { subject: '学科', type: '题型', question: '题干', answer: '答案' };
    issues.push({ line: 1, message: `表头缺少：${missing.map(field => labels[field]).join('、')}。请使用模板中的列名。` });
    return [];
  }
  const rows: DraftQuestion[] = [], seen = new Map<string, number>();
  for (const entry of table.slice(1)) {
    if (entry.cells.length > header.length && entry.cells.slice(header.length).some(value => value.trim())) {
      issues.push({ line: entry.line, message: `第 ${entry.line} 行的列数多于表头，请检查多余的逗号。` });
      continue;
    }
    const raw: RawValues = {};
    header.forEach((field, index) => { if (field) raw[field] = entry.cells[index] ?? ''; });
    collect(rows, issues, seen, buildRow(raw, entry.line, '行'), entry.line);
  }
  return rows;
}

function parseJsonBank(source: string, fallbackName: string, issues: ImportIssue[]): { name: string; note: string; rows: DraftQuestion[] } {
  let parsed: unknown;
  try { parsed = JSON.parse(source.replace(/^\uFEFF/, '')); }
  catch (error) { issues.push({ line: 0, message: `JSON 格式有误：${error instanceof Error ? error.message : '无法解析'}` }); return { name: fallbackName, note: '', rows: [] }; }
  let name = fallbackName, note = '', items: unknown[] = [];
  if (Array.isArray(parsed)) items = parsed;
  else if (parsed && typeof parsed === 'object') {
    const object = parsed as Record<string, unknown>;
    name = cell(object.name ?? object['题库名称'] ?? object['名称']) || fallbackName;
    note = cell(object.note ?? object['备注'] ?? object['说明']);
    const questions = object.questions ?? object['题目'] ?? object['题目列表'];
    if (!Array.isArray(questions)) { issues.push({ line: 0, message: 'JSON 里缺少 questions 题目数组。' }); return { name, note, rows: [] }; }
    items = questions;
  } else { issues.push({ line: 0, message: 'JSON 顶层应为题目数组，或包含 questions 数组的对象。' }); return { name, note, rows: [] }; }

  const rows: DraftQuestion[] = [], seen = new Map<string, number>();
  items.forEach((item, index) => {
    const line = index + 1;
    if (!item || typeof item !== 'object' || Array.isArray(item)) { issues.push({ line, message: `第 ${line} 题不是对象。` }); return; }
    collect(rows, issues, seen, buildRow(objectValues(item as Record<string, unknown>), line, '题'), line);
  });
  if (!items.length) issues.push({ line: 0, message: 'questions 数组里还没有题目。' });
  return { name: name.slice(0, 40) || fallbackName, note: note.slice(0, 120), rows };
}

/** Parse a parent-selected CSV/TSV/JSON file. Pure: no storage or network access. */
export function parseBankText(source: string, filename?: string): ParseResult {
  const fallbackName = filenameName(filename);
  const issues: ImportIssue[] = [];
  if (!source.trim()) return { name: fallbackName, note: '', rows: [], issues: [{ line: 0, message: '文件或粘贴内容为空。' }] };
  if (source.length > MAX_IMPORT_BYTES) return { name: fallbackName, note: '', rows: [], issues: [{ line: 0, message: '文件超过 2 MB，请拆成几个题库分别导入。' }] };
  const trimmed = source.replace(/^\uFEFF/, '').trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = parseJsonBank(source, fallbackName, issues);
    return { ...parsed, issues };
  }
  const rows = parseDelimitedBank(source, fallbackName, issues);
  return { name: fallbackName, note: '', rows, issues };
}

export function emptyBankStore(seed = 1_000_000 + Math.floor(Math.random() * 1_000_000_000)): LocalBankStore {
  return { version: 1, nextId: seed, banks: [] };
}

/** Excel on Chinese Windows often saves CSV as GBK. Prefer UTF-8, then fall back. */
export function decodeBankBytes(bytes: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch {
    try { return new TextDecoder('gbk', { fatal: true }).decode(bytes); }
    catch { return new TextDecoder('utf-8').decode(bytes); }
  }
}

export function addBank(store: LocalBankStore, input: { name: string; note?: string; rows: DraftQuestion[] }, now = new Date()): { store: LocalBankStore; bank: LocalBank } {
  const name = input.name.normalize('NFKC').trim();
  if (!name) throw new Error('请填写题库名称。');
  if (name.length > 40) throw new Error('题库名称最多 40 字。');
  const note = (input.note ?? '').normalize('NFKC').trim().slice(0, 120);
  if (!input.rows.length) throw new Error('没有可导入的题目。');
  if (input.rows.length > MAX_BANK_QUESTIONS) throw new Error(`一个题库最多 ${MAX_BANK_QUESTIONS} 道题，请拆分导入。`);
  const total = store.banks.reduce((sum, bank) => sum + bank.questions.length, 0);
  if (total + input.rows.length > MAX_TOTAL_QUESTIONS) throw new Error(`本地题库总量将超过 ${MAX_TOTAL_QUESTIONS} 道，请先删除或导出旧题库。`);
  if (!Number.isSafeInteger(store.nextId) || store.nextId < 1 || store.nextId + input.rows.length > Number.MAX_SAFE_INTEGER) throw new Error('本地题库编号已用尽，请先导出并重置题库。');

  const bankId = uid();
  let nextId = store.nextId;
  const questions = input.rows.map(draft => {
    const question: FamilyQuestion = {
      id: -(nextId++),
      subject: draft.subject,
      type: draft.type,
      score: draft.mode === 'writing' ? 0 : 10,
      difficulty: 1,
      knowledge_point: draft.knowledge_point || draft.unit || '本地题库',
      question: draft.question,
      options: draft.type === 'choice' ? [...draft.options] : [],
      answer: draft.answer,
      explanation: draft.explanation || '请对照参考答案检查。',
      lessonId: `local-${bankId}`,
      origin: 'local',
      ...(draft.mode ? { mode: draft.mode } : {}),
      ...(draft.unit ? { unit: draft.unit } : {}),
    };
    if (!validQuestion(question) || question.origin !== 'local') throw new Error(`题目“${draft.question.slice(0, 20)}”不完整，未导入。`);
    return question;
  });
  const bank: LocalBank = { version: 1, id: bankId, name, note, importedAt: now.toISOString(), questions };
  return { store: { ...store, nextId, banks: [...store.banks, bank] }, bank };
}

export function decodeBankStore(raw: string): LocalBankStore {
  const parsed = JSON.parse(raw) as LocalBankStore;
  if (!parsed || parsed.version !== 1 || !Number.isSafeInteger(parsed.nextId) || parsed.nextId < 1 || !Array.isArray(parsed.banks)) throw new Error('本地题库数据格式不兼容');
  if (parsed.banks.length > 100) throw new Error('本地题库数量异常，已停止读取。');
  const bankIds = new Set<string>(), questionIds = new Set<number>();
  let total = 0, largestId = 0;
  for (const bank of parsed.banks) {
    if (!bank || bank.version !== 1 || typeof bank.id !== 'string' || !bank.id || typeof bank.name !== 'string' || !bank.name.trim() || bank.name.length > 40 || typeof bank.note !== 'string' || bank.note.length > 120 || !Number.isFinite(Date.parse(bank.importedAt)) || !Array.isArray(bank.questions) || bank.questions.length < 1 || bank.questions.length > MAX_BANK_QUESTIONS) throw new Error('本地题库信息不完整');
    if (bankIds.has(bank.id)) throw new Error('本地题库编号重复');
    bankIds.add(bank.id);
    total += bank.questions.length;
    for (const question of bank.questions) {
      if (!validQuestion(question) || question.origin !== 'local' || question.id >= 0 || question.lessonId !== `local-${bank.id}`) throw new Error('本地题库题目不完整');
      if (questionIds.has(question.id)) throw new Error('本地题库题目编号重复');
      questionIds.add(question.id);
      largestId = Math.max(largestId, -question.id);
    }
  }
  if (total > MAX_TOTAL_QUESTIONS) throw new Error('本地题库题目过多，已停止读取。');
  // A tampered counter could hand new questions an id already used by an old
  // plan's snapshot. Refuse the store instead of silently creating collisions.
  if (parsed.nextId <= largestId) throw new Error('本地题库编号计数异常，已停止读取。');
  return parsed;
}

export function loadBankStore(): LocalBankStore | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(LOCAL_BANK_KEY);
  return raw ? decodeBankStore(raw) : null;
}

export function saveBankStore(store: LocalBankStore): void {
  localStorage.setItem(LOCAL_BANK_KEY, JSON.stringify(store));
}

/** Group imported questions into browseable units without changing their order. */
export function localCourses(banks: LocalBank[]): Course[] {
  return banks.flatMap(bank => {
    const groups = new Map<string, { subject: '语文' | '数学'; unit: string; questions: FamilyQuestion[] }>();
    for (const question of bank.questions) {
      const unit = (question.unit || '未分组').trim() || '未分组';
      const key = `${question.subject}\u0000${unit}`;
      const group = groups.get(key);
      if (group) group.questions.push(question);
      else groups.set(key, { subject: question.subject, unit, questions: [question] });
    }
    return [...groups.values()].map((group, index): Course => ({
      id: `local-${bank.id}-${index}`,
      subject: group.subject,
      title: group.unit,
      section: bank.name,
      edition: 'local',
      expansion: `家长从练习册导入的本地题库《${bank.name}》，本单元共 ${group.questions.length} 道题。题目和答案只保存在当前浏览器，不会上传。`,
      questions: group.questions.slice(0, 12),
      available: group.questions.length,
      bankId: bank.id,
    }));
  });
}

/** Human-readable backup of one local bank; contains answers, so it stays on this device. */
export function bankFile(bank: LocalBank): string {
  return JSON.stringify({
    name: bank.name,
    note: bank.note,
    questions: bank.questions.map(question => ({
      subject: question.subject,
      type: question.type,
      mode: question.mode ?? '',
      question: question.question,
      answer: question.answer,
      options: question.options,
      knowledge_point: question.knowledge_point,
      explanation: question.explanation,
      unit: question.unit ?? '',
    })),
  }, null, 2);
}

export function safeBankFilename(name: string): string {
  return `${name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 40) || '本地题库'}.json`;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const TEMPLATE_HEADERS = ['学科', '题型', '题干', '答案', '选项A', '选项B', '选项C', '选项D', '知识点', '解析', '单元'];

export function csvTemplate(): string {
  const rows = [
    TEMPLATE_HEADERS,
    ['语文', '默写', '看拼音，写词语：chí táng', '池塘', '', '', '', '', '第一单元 · 词语', '对照课本检查每个字。', '第一单元'],
    ['数学', '选择', '每盒 6 支铅笔，3 盒共有多少支？', 'B', 'A. 9 支', 'B. 18 支', 'C. 12 支', 'D. 24 支', '表内乘法', '6 × 3 = 18（支）。', '第一单元'],
    ['语文', '仿写', '围绕“春天”写一句自己的话。', '春天来了，小草从土里探出头。', '', '', '', '', '第一单元 · 写话', '仿写只记录原文，不自动判分。', '第一单元'],
  ];
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function jsonTemplate(): string {
  return JSON.stringify({
    name: '示例 · 本地题库模板',
    note: '把示例题替换成自己购买的练习册内容；只在本机导入。',
    questions: [
      { subject: '语文', type: '默写', question: '看拼音，写词语：chí táng', answer: '池塘', knowledge_point: '第一单元 · 词语', explanation: '对照课本检查每个字。', unit: '第一单元' },
      { subject: '数学', type: '选择', question: '每盒 6 支铅笔，3 盒共有多少支？', answer: 'B', options: ['A. 9 支', 'B. 18 支', 'C. 12 支', 'D. 24 支'], knowledge_point: '表内乘法', explanation: '6 × 3 = 18（支）。', unit: '第一单元' },
    ],
  }, null, 2);
}
