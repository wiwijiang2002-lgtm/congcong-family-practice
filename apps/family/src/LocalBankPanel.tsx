'use client';

import { useRef, useState } from 'react';
import type { Ref } from 'react';
import { BookOpen, CheckCircle2, CircleAlert, Download, FileUp, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { download } from './download';
import {
  MAX_IMPORT_BYTES,
  bankFile,
  csvTemplate,
  decodeBankBytes,
  jsonTemplate,
  parseBankText,
  safeBankFilename,
  type DraftQuestion,
  type LocalBank,
  type ParseResult,
} from './local-bank';

interface Props {
  banks: LocalBank[];
  error?: string;
  headingRef: Ref<HTMLHeadingElement>;
  onImport: (input: { name: string; note: string; rows: DraftQuestion[] }) => boolean;
  onDelete: (id: string) => void;
  onReset: () => void;
  onExportRaw: () => void;
  onAssign: (bank: LocalBank) => void;
  notice: (message: string) => void;
}

const typeLabel = (question: DraftQuestion) =>
  question.mode === 'writing' ? '仿写' : question.mode === 'dictation' ? '默写' : question.type === 'choice' ? '选择' : question.mode === 'text' ? '填写' : '填空';
const answerLabel = (question: DraftQuestion) => {
  if (question.type !== 'choice') return question.answer;
  const index = question.answer.charCodeAt(0) - 65;
  return `${question.answer}. ${question.options[index] ?? ''}`;
};
const short = (value: string, length = 56) => value.length > length ? `${value.slice(0, length)}…` : value;

export function LocalBankPanel({ banks, error, headingRef, onImport, onDelete, onReset, onExportRaw, onAssign, notice }: Props) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState<ParseResult | null>(null);
  const [sourceLabel, setSourceLabel] = useState('');
  const [paste, setPaste] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function readFile(file: File) {
    if (file.size > MAX_IMPORT_BYTES) { notice('文件超过 2 MB，请拆成几个题库分别导入。'); return; }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      apply(parseBankText(decodeBankBytes(bytes), file.name), file.name);
    } catch {
      notice('文件读取失败，请确认是 CSV、TSV 或 JSON 文本文件。');
    }
  }
  function apply(result: ParseResult, source: string) {
    setDraft(result);
    setName(result.name);
    setNote(result.note);
    setSourceLabel(source);
    if (!result.rows.length) notice(result.issues[0]?.message ?? '没有找到可导入的题目。');
  }
  function parsePaste() {
    if (!paste.trim()) { notice('先粘贴从 Excel 或表格复制的题目内容。'); return; }
    apply(parseBankText(paste, '粘贴内容.csv'), '粘贴内容');
  }
  function confirmImport() {
    if (!draft || !draft.rows.length) return;
    const ok = onImport({ name, note, rows: draft.rows });
    if (ok) { setDraft(null); setSourceLabel(''); setPaste(''); setName(''); setNote(''); if (fileInput.current) fileInput.current.value = ''; }
  }
  function downloadTemplate(kind: 'csv' | 'json') {
    if (kind === 'csv') download('本地题库导入模板.csv', csvTemplate(), 'text/csv;charset=utf-8');
    else download('本地题库导入模板.json', jsonTemplate(), 'application/json;charset=utf-8');
    notice('模板已下载。示例题是自编内容，请替换成练习册中的题目。');
  }

  const units = new Set<string>();
  for (const bank of banks) for (const question of bank.questions) units.add(`${question.subject}|${question.unit || ''}`);
  const draftSubjects = draft ? draft.rows.reduce((map, row) => map.set(row.subject, (map.get(row.subject) ?? 0) + 1), new Map<string, number>()) : null;

  return <>
    <div className="page-heading"><div><span className="eyebrow">练习册题库 · 只留在这台设备</span><h1 ref={headingRef} tabIndex={-1}>我的本地题库</h1><p>把购买练习册的题目和答案导入当前浏览器，再挑选布置给孩子。</p></div></div>

    <div className="inline-note bank-privacy"><ShieldCheck size={18}/><span><strong>题目和答案不会上传。</strong>导入内容只写入当前浏览器的 localStorage，不提交到公开仓库、不经过服务器。换设备、换浏览器或清除网站数据后需要重新导入；请用“导出备份”保留副本。</span></div>

    {error && <section className="panel bank-error" role="alert"><CircleAlert size={22}/><div><h2>本地题库数据无法读取</h2><p>{error}。原数据没有被覆盖；可以先导出原始数据，再重置本地题库。</p><div className="button-row"><button className="secondary" onClick={onExportRaw}><Download size={17}/>导出原始数据</button><button className="danger" onClick={() => { if (confirmDelete === 'reset') { onReset(); setConfirmDelete(null); } else setConfirmDelete('reset'); }}>{confirmDelete === 'reset' ? '确认清空本地题库' : '清空本地题库'}</button></div></div></section>}

    <div className="bank-stats stats-grid child-stats"><div><span><BookOpen size={17}/>题库数量</span><strong>{banks.length}<small> 个</small></strong></div><div><span><FileUp size={17}/>本地题目</span><strong>{banks.reduce((sum, bank) => sum + bank.questions.length, 0)}<small> 道</small></strong></div><div><span><Upload size={17}/>单元分类</span><strong>{units.size}<small> 类</small></strong></div></div>

    {!error && <section className="panel bank-import">
      <div className="section-heading"><h2><FileUp size={19}/>导入题库</h2><span className="muted small">支持 CSV / Excel 粘贴 / JSON</span></div>
      <p className="muted small">从 Excel、WPS 或 Numbers 复制含表头的题目区域，直接粘贴；也可以导入 CSV/JSON 文件。必填列：学科、题型、题干、答案；选择题再填选项 A–D。</p>
      <div className="bank-import-grid">
        <div className="bank-import-box">
          <strong>选择文件</strong>
          <p>CSV、TSV、TXT 或 JSON，最大 2 MB。UTF-8 或 Excel 的 GBK CSV 均可。</p>
          <label className="file-button"><FileUp size={17}/>选择题库文件<input ref={fileInput} type="file" accept=".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,application/json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void readFile(file); }}/></label>
          {sourceLabel && draft && <span className="muted small">已读取：{sourceLabel}</span>}
        </div>
        <div className="bank-import-box">
          <strong>从表格粘贴</strong>
          <textarea rows={5} value={paste} onChange={event => setPaste(event.target.value)} placeholder={'学科\t题型\t题干\t答案\t选项A\t选项B\t选项C\t选项D\t知识点\t解析\t单元'} aria-label="粘贴题库表格"/>
          <button className="secondary" onClick={parsePaste}><Upload size={17}/>解析粘贴内容</button>
        </div>
      </div>
      <div className="button-row bank-template-row"><button className="text-button" onClick={() => downloadTemplate('csv')}><Download size={16}/>下载 CSV 模板</button><button className="text-button" onClick={() => downloadTemplate('json')}><Download size={16}/>下载 JSON 模板</button><span className="muted small">模板只是两三个自编示例，不含任何练习册原题。</span></div>

      {draft && <div className="bank-preview">
        <div className="section-heading"><h2>导入预览</h2><span className={`badge ${draft.rows.length ? 'good' : 'bad'}`}>{draft.rows.length ? `${draft.rows.length} 道可导入` : '没有可导入的题目'}</span></div>
        {draftSubjects && draft.rows.length > 0 && <p className="muted small">学科：{[...draftSubjects].map(([subject, count]) => `${subject} ${count} 道`).join(' · ')}{draft.issues.length ? ` · ${draft.issues.length} 条行提示` : ''}</p>}
        <div className="bank-meta-fields"><label>题库名称<input maxLength={40} value={name} onChange={event => setName(event.target.value)} placeholder="例如：二上语文练习册"/></label><label>备注（可选）<input maxLength={120} value={note} onChange={event => setNote(event.target.value)} placeholder="例如：第 3 单元，家长自用"/></label></div>
        {draft.rows.length > 0 && <div className="bank-table-wrap"><table className="bank-table"><thead><tr><th>#</th><th>学科 / 题型</th><th>题干</th><th>答案</th><th>知识点</th></tr></thead><tbody>{draft.rows.slice(0, 8).map((row, index) => <tr key={index}><td>{index + 1}</td><td>{row.subject} · {typeLabel(row)}</td><td>{short(row.question)}</td><td>{short(answerLabel(row), 28)}</td><td>{short(row.knowledge_point, 20)}</td></tr>)}</tbody></table></div>}
        {draft.rows.length > 8 && <p className="muted small">预览前 8 道，共 {draft.rows.length} 道。</p>}
        {draft.issues.length > 0 && <div className="bank-issues"><strong><CircleAlert size={16}/>有 {draft.issues.length} 条内容未导入</strong><ul>{draft.issues.slice(0, 12).map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>{draft.issues.length > 12 && <p className="muted small">还有 {draft.issues.length - 12} 条，请检查源文件。</p>}<p className="muted small">只有上面预览中的有效题目会被保存；有问题的行不会变成题目。</p></div>}
        <div className="button-row"><button className="primary" disabled={!draft.rows.length || !name.trim() || name.trim().length > 40} onClick={confirmImport}><CheckCircle2 size={18}/>保存到本浏览器</button><button className="secondary" onClick={() => { setDraft(null); setSourceLabel(''); }}>取消</button></div>
      </div>}

      <details className="bank-format"><summary>查看列名与题型规则</summary><div className="bank-format-body">
        <p><strong>列名</strong>（中英文均可）：学科、题型、题干、答案、选项A、选项B、选项C、选项D、知识点、解析、单元。选择题请填 2–4 个选项；答案填 A/B/C/D，或与某个选项文字完全一致。</p>
        <p><strong>题型：</strong>“选择”自动判分；“填空”语文用文字输入、数学必须填数字；“默写”使用文字输入；“仿写”只记录原文，不自动判分（0 分）。</p>
        <p><strong>单元</strong>可留空；填写后会在“自由选课”里按单元分组，每个单元单次练习最多 12 道。无法自动判分的行会在预览中列出并跳过。</p>
        <p><strong>建议：</strong>先从练习册里选一个单元、几十道题试导入，确认题干、答案和选项无误后，再导入整册。系统不会替家长判断练习册答案是否正确。</p>
      </div></details>
    </section>}

    <div className="section-heading bank-list-heading"><h2>已保存的题库<span className="count-pill">{banks.length}</span></h2><span className="muted small">只在本浏览器可见</span></div>
    {banks.length ? <div className="bank-list">{banks.map(bank => {
      const chinese = bank.questions.filter(question => question.subject === '语文').length;
      const math = bank.questions.length - chinese;
      const bankUnits = new Set(bank.questions.map(question => `${question.subject}|${question.unit || ''}`)).size;
      return <article className="bank-card" key={bank.id}>
        <div className="bank-card-heading"><span className="subject-icon sage"><BookOpen size={22}/></span><div><h3>{bank.name}</h3><p>{bank.questions.length} 道 · {chinese ? `语文 ${chinese}` : ''}{chinese && math ? ' / ' : ''}{math ? `数学 ${math}` : ''} · {bankUnits} 个单元 · 导入于 {new Date(bank.importedAt).toLocaleDateString('zh-CN')}</p>{bank.note && <p className="bank-note">{bank.note}</p>}</div><button className="primary" onClick={() => onAssign(bank)}>布置练习</button></div>
        <div className="button-row bank-card-actions"><button className="secondary" onClick={() => { download(safeBankFilename(bank.name), bankFile(bank), 'application/json;charset=utf-8'); notice('题库备份已下载。文件含答案，请只保存在家长自己的设备上。'); }}><Download size={16}/>导出备份</button><button className="text-button red-text" onClick={() => setConfirmDelete(confirmDelete === bank.id ? null : bank.id)}><Trash2 size={16}/>{confirmDelete === bank.id ? '再点一次确认删除' : '删除'}</button>{confirmDelete === bank.id && <span className="muted small">删除题库不会删除已经布置过的练习和结果。</span>}</div>
        {confirmDelete === bank.id && <div className="bank-delete"><span>删除《{bank.name}》？已完成的练习不受影响，但之后不能再从这份题库布置题目。</span><div className="button-row"><button className="danger" onClick={() => { onDelete(bank.id); setConfirmDelete(null); }}>确认删除</button><button className="secondary" onClick={() => setConfirmDelete(null)}>保留</button></div></div>}
        <details className="bank-detail"><summary>查看题目（含答案）</summary><ol>{bank.questions.slice(0, 20).map(question => <li key={question.id}><span className="card-kicker">{question.subject} · {question.unit || '未分组'} · {question.knowledge_point}</span><p>{question.question}</p><p className="muted small">答案：{question.type === 'choice' ? `${question.answer}. ${question.options[question.answer.charCodeAt(0) - 65] ?? ''}` : question.answer}</p></li>)}</ol>{bank.questions.length > 20 && <p className="muted small">只显示前 20 道，共 {bank.questions.length} 道。</p>}</details>
      </article>;
    })}</div> : !error && <div className="empty spacious"><BookOpen size={38}/><h2>还没有本地题库</h2><p>用上面的模板或从 Excel 粘贴，导入第一份练习册题目。题目只保存在这台设备的浏览器里。</p><button className="secondary" onClick={() => fileInput.current?.click()}><FileUp size={17}/>选择题库文件</button></div>}
  </>;
}
