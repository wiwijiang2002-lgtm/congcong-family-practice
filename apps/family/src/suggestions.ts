import type { FamilyQuestion } from './data';
import type { State } from './domain';
import type { LocalBank } from './local-bank';
import { weeklyTopics, type WeeklyTopic } from './weekly';

/** A weak topic plus unused local-bank questions that look like the same skill. */
export interface BankSuggestion {
  topic: WeeklyTopic;
  label: string;
  questions: FamilyQuestion[];
  /** Number of unused matching questions found before the per-topic cap. */
  matched: number;
  bankNames: string[];
}
export interface SuggestionOptions {
  perTopic?: number;
  maxTopics?: number;
}

const FOCUS_KEYWORDS: Record<string, string[]> = {
  'mul-groups-small': ['乘法', '相同加数'],
  'mul-word-small': ['乘法', '应用题'],
  'mul-facts-small': ['乘法', '口诀'],
  'div-facts-small': ['除法', '口诀', '求商'],
  'div-share-small': ['除法', '平均分', '每份'],
  'div-groups-small': ['除法', '平均分', '份数'],
  'mul-facts-large': ['乘法', '口诀'],
  'div-facts-large': ['除法', '口诀', '求商'],
  'mul-word-large': ['乘法', '应用题'],
  'place-compose': ['三位数', '组成', '数位'],
  'number-between': ['三位数', '大小比较'],
  'place-digit': ['数位', '百位', '十位', '个位'],
  'three-boundary': ['三位数', '数序', '最大', '最小'],
  'add-carry': ['加法', '进位'],
  'sub-borrow': ['减法', '退位'],
  'remainder': ['余数', '有余数', '除法'],
  'remainder-rule': ['余数', '除数'],
  'full-groups': ['余数', '装满', '份数'],
};

// Words that are too broad to prove that two questions practise the same skill.
const GENERIC = new Set([
  '本地题库', '语文', '数学', '练习', '复习', '巩固', '单元', '知识点', '题目', '基础', '提高',
  '课文', '阅读', '词语', '字词', '默写', '背诵', '词语默写', '字词默写', '古诗背诵片段',
  '上册', '下册', '二年级', '第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八',
]);

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase()
    .replace(/[\s·•|/、,，。；;：:()（）《》【】\[\]"'“”‘’!?！？—\-]+/g, '');
}

const SPLIT = /[·•|/、,，;；:：()（）《》【】\[\]\s的]+/;

function displayLabel(topic: WeeklyTopic): string {
  return topic.label.replace(/（本地题库）$/, '');
}

function phrasesFor(topic: WeeklyTopic): string[] {
  const raw: string[] = [];
  if (topic.key.startsWith('local:')) {
    // Imported questions only have their own workbook knowledge point; never
    // infer a built-in skill that the parent did not tag.
    raw.push(topic.source.knowledge_point);
  } else if (topic.key.startsWith('word:')) {
    raw.push(topic.key.slice(5), topic.source.answer, topic.source.knowledge_point);
  } else if (topic.key.startsWith('poem:')) {
    raw.push(topic.key.slice(5), topic.source.answer, topic.source.knowledge_point);
  } else if (topic.key.startsWith('math:')) {
    raw.push(topic.label, topic.source.knowledge_point, ...(FOCUS_KEYWORDS[topic.key.slice(5)] ?? []));
  } else {
    raw.push(topic.label, topic.source.knowledge_point);
  }
  const phrases = new Set<string>();
  for (const value of raw) {
    for (const part of value.split(SPLIT)) {
      const phrase = normalize(part.replace(/^[的地得]+|[的地得]+$/g, ''));
      if (phrase.length >= 2 && !GENERIC.has(phrase) && !/^第[一二三四五六七八九十\d]+单元$/.test(phrase)) phrases.add(phrase);
    }
  }
  return [...phrases];
}

function questionKey(question: FamilyQuestion): string {
  return `${question.subject}|${normalize(question.question)}|${normalize(question.answer)}`;
}

function matchScore(phrases: string[], topic: WeeklyTopic, question: FamilyQuestion): number {
  if (question.subject !== topic.subject) return 0;
  const fields = [question.knowledge_point, question.unit ?? '', question.question, question.answer].map(normalize).filter(Boolean);
  let score = 0;
  for (const phrase of phrases) {
    for (const field of fields) {
      if (field === phrase) score = Math.max(score, 100);
      else if (field.includes(phrase)) score = Math.max(score, 30);
    }
  }
  if (score > 0 && question.unit && topic.source.unit && normalize(question.unit) === normalize(topic.source.unit)) score += 10;
  return score;
}

/**
 * Weak topics that are waiting for practice. Passed or already-scheduled topics
 * are left out so the suggestion panel does not duplicate an active task.
 */
export function recentWeakTopics(state: State, now = new Date()): WeeklyTopic[] {
  return weeklyTopics(state, now).filter(topic =>
    (topic.status === 'needs-practice' || topic.status === 'unsupported') && !topic.pendingPractice
  );
}

/**
 * Suggest unused local-bank questions for recent weak topics. This only builds a
 * proposal for a parent to review; it never creates or publishes a plan itself.
 */
export function suggestBankPractice(state: State, banks: LocalBank[], now = new Date(), options: SuggestionOptions = {}): BankSuggestion[] {
  if (!banks.length) return [];
  const weak = recentWeakTopics(state, now);
  if (!weak.length) return [];

  const perTopic = Math.max(1, Math.min(6, options.perTopic ?? 3));
  const maxTopics = Math.max(1, Math.min(5, options.maxTopics ?? 3));
  const usedIds = new Set<number>(), usedKeys = new Set<string>();
  const remember = (question: FamilyQuestion) => { usedIds.add(question.id); usedKeys.add(questionKey(question)); };
  for (const plan of state.plans) for (const question of plan.questions) remember(question);
  for (const attempt of state.attempts) for (const response of attempt.responses) remember(response.question);

  const bankByLesson = new Map<string, LocalBank>(banks.map(bank => [`local-${bank.id}`, bank] as const));
  const pool = banks.flatMap((bank, bankIndex) => bank.questions
    .filter(question => question.score > 0)
    .map((question, index) => ({ question, bank, bankIndex, index })));

  const ranked = weak.map(topic => {
    const phrases = phrasesFor(topic);
    const matches = pool
      .filter(item => !usedIds.has(item.question.id) && !usedKeys.has(questionKey(item.question)))
      .map(item => ({ ...item, score: matchScore(phrases, topic, item.question) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.bankIndex - b.bankIndex || a.index - b.index);
    return { topic, matches };
  }).filter(item => item.matches.length > 0);

  if (!ranked.length) {
    const topic = weak[0];
    return [{ topic, label: displayLabel(topic), questions: [], matched: 0, bankNames: [] }];
  }

  const out: BankSuggestion[] = [];
  for (const item of ranked.slice(0, maxTopics)) {
    const available = item.matches.filter(candidate =>
      !usedIds.has(candidate.question.id) && !usedKeys.has(questionKey(candidate.question))
    );
    const picked: FamilyQuestion[] = [];
    for (const candidate of available) {
      if (picked.length >= perTopic) break;
      picked.push(candidate.question);
      remember(candidate.question);
    }
    if (!picked.length) continue;
    const bankNames = [...new Set(picked.map(question => bankByLesson.get(question.lessonId ?? '')?.name ?? '').filter(Boolean))];
    out.push({ topic: item.topic, label: displayLabel(item.topic), questions: picked, matched: available.length, bankNames });
  }
  return out.length ? out : [{ topic: weak[0], label: displayLabel(weak[0]), questions: [], matched: 0, bankNames: [] }];
}
