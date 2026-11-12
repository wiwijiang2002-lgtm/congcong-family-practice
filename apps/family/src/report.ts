import type { Attempt, Response, State } from './domain';
import { localDate } from './domain';
import { typeName } from './data';
import { weeklyTopics, weekWindow, weeklyAttemptLabel } from './weekly';
import { focusFor } from './weekly-questions';

const escape = (value: string | number) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function displayAnswer(value: string, r: Response): string {
  if (r.question.type !== 'choice') return value;
  const letter = value.normalize('NFKC').trim().toUpperCase();
  return /^[A-D]$/.test(letter) ? r.question.options[letter.charCodeAt(0)-65] ?? value : value;
}
function time(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}
function item(r: Response, index: number): string {
  const status = r.correct === null ? '仿写 · 待家长交流' : r.correct ? '答对' : '待巩固';
  const color = r.correct === null ? 'writing' : r.correct ? 'correct' : 'wrong';
  return `<article class="question ${color}">
    <div class="question-top"><span>第 ${index+1} 题 · ${escape(r.question.subject)} · ${escape(typeName(r.question))}</span><strong class="status">${status}</strong></div>
    <h3>${escape(r.question.question)}</h3>
    ${r.question.options.length ? `<ul class="options">${r.question.options.map(o=>`<li>${escape(o)}</li>`).join('')}</ul>` : ''}
    <p class="knowledge">知识点：${escape(r.question.knowledge_point)}</p>
    <div class="answer"><span>孩子作答</span><p>${escape(displayAnswer(r.answer,r))}</p></div>
    <div class="answer"><span>${r.correct === null ? '参考示例（答案不唯一）' : '参考答案'}</span><p>${escape(displayAnswer(r.question.answer,r))}</p></div>
    <div class="explanation"><strong>${r.correct === null ? '交流提示' : '讲解'}</strong><p>${escape(r.question.explanation)}</p></div>
  </article>`;
}

/** Offline, human-readable report. No raw record IDs, remote resources or child identities. */
export function learningReport(attempts: Attempt[], now = new Date(), options?:{title:string}): { filename: string; html: string } {
  if (!attempts.length) throw new Error('完成一份练习后，就能导出学习报告。');
  const records = [...attempts].sort((a,b)=>b.completedAt.localeCompare(a.completedAt));
  const responses = records.flatMap(a=>a.responses);
  const objective = responses.filter(r=>r.correct !== null);
  const score = records.reduce((n,a)=>n+a.score,0), total = records.reduce((n,a)=>n+a.total,0);
  const right = objective.filter(r=>r.correct).length, wrong = objective.length-right;
  const ratio = total ? Math.round(score/total*100)+'%' : '—';
  const title = options?.title ?? (records.length === 1 ? '本次学习报告' : '家庭学习报告');
  const sections = records.map((a,i) => {
    const graded = a.responses.filter(r=>r.correct !== null);
    return `<section class="practice"><div class="practice-heading"><div><span class="eyebrow">练习 ${i+1} · 安排日期 ${escape(a.date)}</span><h2>${escape(a.title)}</h2><p class="muted">完成时间：${escape(time(a.completedAt))}</p></div><div class="score">${a.score}<small> / ${a.total} 分</small></div></div>
      <p class="practice-stats">${weeklyAttemptLabel(a)?escape(weeklyAttemptLabel(a))+' · ':''}客观题答对 ${graded.filter(r=>r.correct).length} / ${graded.length} 道 · 仿写 ${a.responses.length-graded.length} 道（单独记录，不计分）</p>
      ${a.responses.map(item).join('')}
    </section>`;
  }).join('');
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>聪聪学堂 · ${title}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f7f1;color:#263c30;font:16px/1.7 "PingFang SC","Microsoft YaHei",system-ui,sans-serif}main{max-width:940px;margin:36px auto;padding:34px;background:white;border:1px solid #e0e8da;border-radius:18px}h1,h2,h3,p{margin:0}h1{font-size:29px;margin:8px 0}h2{font-size:22px;margin:5px 0}h3{font-size:18px;margin:12px 0;white-space:pre-wrap;overflow-wrap:anywhere}button{font:inherit;background:#548e29;color:white;border:0;border-radius:10px;padding:10px 18px;cursor:pointer;min-height:44px}.toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:27px}.brand{font-weight:700;color:#5a7f43}.muted,.eyebrow{font-size:13px;color:#6f7e66}.intro{margin-top:8px;color:#667c57;font-size:14px}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:25px 0}.summary>div{background:#f1f6eb;padding:16px;border-radius:12px;font-size:13px;color:#627b50}.summary strong{display:block;font-size:25px;color:#3c5f28}.note{font-size:13px;color:#6e7d62;margin:16px 0 25px}.practice{border-top:2px solid #dce8d2;margin-top:30px;padding-top:24px}.practice-heading{display:flex;justify-content:space-between;align-items:center;gap:20px}.score{font-size:32px;font-weight:700;color:#54802e;white-space:nowrap}.score small{font-size:14px;font-weight:400}.practice-stats{font-size:13px;color:#718260;margin:12px 0 22px}.question{padding:20px;border:1px solid #e2e8dc;border-radius:12px;margin:15px 0;break-inside:avoid;page-break-inside:avoid}.question-top{display:flex;justify-content:space-between;gap:14px;font-size:13px;color:#718164}.status{color:#538330;font-size:13px}.wrong .status{color:#ac4e38}.writing .status{color:#8b7341}.knowledge{font-size:12px;color:#79866e;margin:8px 0 14px}.options{padding-left:23px;margin:10px 0;color:#536b43;list-style:none}.answer{display:grid;grid-template-columns:158px minmax(0,1fr);gap:10px;margin:9px 0}.answer>span{font-size:13px;color:#718260}.answer p,.explanation p{white-space:pre-wrap;overflow-wrap:anywhere}.explanation{background:#f7f9f3;padding:12px 15px;border-radius:8px;margin-top:14px;font-size:14px;color:#647c53}.explanation strong{display:block;margin-bottom:3px}.footer{font-size:12px;color:#819072;margin-top:32px;border-top:1px solid #e6ecdf;padding-top:18px}.print-hint{font-size:12px;color:#7a896d;margin:8px 0}
@media(max-width:640px){main{padding:20px;margin:12px;border-radius:12px}.toolbar{align-items:flex-start;flex-direction:column}.summary{grid-template-columns:repeat(2,minmax(0,1fr))}h1{font-size:25px}.answer{grid-template-columns:1fr;gap:0}.practice-heading{align-items:flex-start}.score{font-size:26px}.question{padding:16px}.question-top{flex-wrap:wrap;gap:4px}}
@page{size:A4;margin:14mm}@media print{body{background:white;font-size:12pt;line-height:1.55}main{margin:0;padding:0;max-width:none;border:0;border-radius:0}.toolbar button,.print-hint{display:none}.toolbar{margin-bottom:12px}.summary{gap:8px}.summary>div{padding:10px;border:1px solid #d9e1d2}.summary strong{font-size:20px}.practice{break-before:page;page-break-before:always}.practice:first-of-type{break-before:auto;page-break-before:auto}.practice-heading{break-inside:avoid}.question{padding:13px;margin:10px 0}.question h3{font-size:13pt}.answer{grid-template-columns:125px minmax(0,1fr)}.explanation{border-left:2px solid #d6e2cc;background:white}.footer{margin-top:18px}}
</style></head><body><main>
<div class="toolbar"><span class="brand">聪聪学堂 · 二年级上册</span><button type="button" onclick="window.print()">打印 / 另存为 PDF</button></div>
<p class="eyebrow">统编语文 · 苏教数学</p><h1>${title}</h1><p class="muted">导出时间：${escape(now.toLocaleString('zh-CN',{hour12:false}))}</p><p class="intro">保留每一次练习的收获，也看看下一次可以巩固什么。</p>
<div class="summary"><div>完成练习<strong>${records.length} 份</strong></div><div>客观题正确率<strong>${ratio}</strong></div><div>待巩固作答<strong>${wrong} 道</strong></div><div>仿写记录<strong>${responses.length-objective.length} 道</strong></div></div>
<p class="note">客观题共 ${objective.length} 道，答对 ${right} 道；累计得分 ${score} / ${total} 分。仿写保存原文，供家长阅读交流，不自动判分。待巩固作答按所选练习累计，同一题多次作答会分别列出。</p>
<p class="print-hint">这是可离线打开的学习报告。点击上方按钮可打印，或在浏览器打印窗口选择“另存为 PDF”。</p>
${sections}<footer class="footer">聪聪学堂 · 家庭练习体验版。本报告使用本浏览器保存的练习结果生成；练习内容为自编示例，生字与必背要求请以学校教学安排为准。</footer>
</main></body></html>`;
  return { filename: `聪聪学堂-${records.length===1?'本次学习报告':'学习报告'}-${localDate(now)}.html`, html };
}

export function weeklyLearningReport(state:State,now=new Date()):{filename:string;html:string} {
  const topics=weeklyTopics(state,now),window=weekWindow(now);
  if(!topics.length)throw new Error('最近 7 天还没有需要巩固的错题。');
  const keys=new Set(topics.map(t=>t.key));
  const records:Attempt[]=state.attempts.filter(a=>Date.parse(a.completedAt)<=now.getTime()&&(Date.parse(a.completedAt)>=window.start||topics.some(t=>t.lastWrongAt===a.completedAt))).map(a=>{
    const responses=a.responses.filter(r=>r.correct!==null&&keys.has(focusFor(r.question).key));
    return {...a,responses,score:responses.reduce((n,r)=>n+(r.correct?r.question.score:0),0),total:responses.reduce((n,r)=>n+r.question.score,0)};
  }).filter(a=>a.responses.length>0);
  const report=learningReport(records,now,{title:'一周错题巩固报告'});
  const progress=`<section class="weekly-summary" style="margin:28px 0;padding:22px;border:1px solid #dce8d2;border-radius:12px"><h2>一周巩固进度</h2><p class="note">统计范围：${window.from} 至 ${window.to}（含今天）。未完成的隔日复测会延续保留。先做 2 道同类新题并全部答对，至少间隔 24 小时，再独立完成 2 道未见新题。本轮通过仅代表此次检验的表现，仍需后续观察。</p>${topics.map(t=>`<article class="question"><h3>${escape(t.subject)} · ${escape(t.label)}</h3><p><strong>${escape(t.statusLabel)}</strong> · 本周错答 ${t.errors} 次</p><p>原题：${t.originalCorrected?'已订正':'保留错答记录'}；同类新题：${t.practice?'2 / 2 答对':'尚未通过'}；隔日独立复测：${t.verification?'2 / 2 答对':'尚未通过'}。</p>${t.readyAt&&!t.verification?`<p>复测开放：${escape(time(t.readyAt))}</p>`:''}<p class="muted">${escape(t.note)}</p></article>`).join('')}</section>`;
  return {filename:`聪聪学堂-一周错题巩固报告-${window.to}.html`,html:report.html.replace('<section class="practice">',progress+'<section class="practice">')};
}
