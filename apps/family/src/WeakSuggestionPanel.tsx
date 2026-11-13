'use client';

import { BookOpen, ChevronRight, CircleAlert, Library, Lightbulb, Sprout } from 'lucide-react';
import type { FamilyQuestion } from './data';
import type { State } from './domain';
import type { LocalBank } from './local-bank';
import { recentWeakTopics, suggestBankPractice } from './suggestions';

interface Props {
  state: State;
  banks: LocalBank[];
  now: Date;
  onUse: (questions: FamilyQuestion[], label: string) => void;
  onOpenBank: () => void;
}

const answerText = (question: FamilyQuestion) => question.type === 'choice'
  ? `${question.answer}. ${question.options[question.answer.charCodeAt(0) - 65] ?? ''}`
  : question.answer;
const timeText = (at: string) => new Date(at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

export function WeakSuggestionPanel({ state, banks, now, onUse, onOpenBank }: Props) {
  if (!banks.length) {
    return <section className="panel suggestion-panel suggestion-empty">
      <div className="section-heading"><h2><Lightbulb size={19}/>弱点建议练习</h2><button className="text-button" onClick={onOpenBank}>去导入题库 <ChevronRight size={16}/></button></div>
      <p className="muted small">导入练习册题库后，这里会根据最近 7 天的错题，从本地题库寻找同知识点、还没有布置过的题，供你确认后再布置。</p>
    </section>;
  }

  const suggestions = suggestBankPractice(state, banks, now);
  const weak = recentWeakTopics(state, now);

  return <section className="panel suggestion-panel">
    <div className="section-heading"><h2><Lightbulb size={19}/>弱点建议练习</h2><button className="text-button" onClick={onOpenBank}>管理题库 <ChevronRight size={16}/></button></div>
    <p className="muted small suggestion-intro">根据最近 7 天的错题，优先从本地题库找同知识点、还没有布置过的题；题目未标注知识点时按同单元/同题库回退。建议不会自动发布；先预览，确认后再布置。</p>

    {!suggestions.length ? <div className="suggestion-zero">
      <Sprout size={25}/>
      <div><strong>{weak.length ? '题库里暂时没有匹配的未做题' : '最近 7 天没有需要巩固的错题'}</strong><p>{weak.length ? '可以补充同知识点的题目，或到“我的题库”手动挑选。' : '完成练习后，错题会在这里变成可用的建议练习。'}</p></div>
      {weak.length > 0 && <button className="secondary" onClick={onOpenBank}><Library size={16}/>去题库看看</button>}
    </div> : <div className="suggestion-list">{suggestions.map(suggestion => <article className="suggestion-card" key={suggestion.topic.key}>
      <div className="suggestion-heading">
        <div><span className="card-kicker">{suggestion.topic.subject} · 最近错答 {suggestion.topic.errors} 次 · 最近 {timeText(suggestion.topic.lastWrongAt)}</span><h3>{suggestion.label}</h3><p className="muted small">{suggestion.bankNames.join('、')} · 匹配 {suggestion.matched} 道，建议 {suggestion.questions.length} 道</p></div>
        <span className={`badge ${suggestion.questions.length ? 'good' : 'bad'}`}>{suggestion.questions.length ? `建议 ${suggestion.questions.length} 道` : '暂无匹配'}</span>
      </div>
      {suggestion.questions.length ? <>
        {suggestion.basis !== 'tag' && <p className="suggestion-fallback"><CircleAlert size={14}/><span>题目没有标注可用知识点，按{suggestion.basis === 'unit' ? '同单元' : '同题库'}推荐；请核对是否同类题后再布置。</span></p>}
        <details className="suggestion-preview"><summary>预览建议题目（含答案）</summary><ol>{suggestion.questions.map(question => <li key={question.id}><p><strong>{question.question}</strong></p><span className="muted small">{question.knowledge_point}{question.unit ? ` · ${question.unit}` : ''}</span><p className="suggestion-answer">答案：{answerText(question)}</p></li>)}</ol></details>
        <div className="button-row suggestion-actions"><button className="primary" onClick={() => onUse(suggestion.questions, suggestion.label)}>用这 {suggestion.questions.length} 道准备练习 <ChevronRight size={17}/></button><span className="muted small">只会打开布置页，不会直接发布。</span></div>
      </> : <div className="inline-note"><BookOpen size={16}/><span>题库里没有找到可用的未做题（已检查同知识点、同单元/同题库）。可以补充题目，或到题库手动选择。</span></div>}
    </article>)}</div>}
  </section>;
}
