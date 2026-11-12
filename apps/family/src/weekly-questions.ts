import { BANK, VOCABULARY, type FamilyQuestion } from './data';

export interface Focus { key: string; label: string; subject: '语文' | '数学'; source: FamilyQuestion; supported: boolean; note: string }
const names:Record<string,string>={
 'mul-groups-small':'相同加数与乘法','mul-word-small':'1～6乘法应用','mul-facts-small':'1～6乘法口诀',
 'div-facts-small':'1～6口诀求商','div-share-small':'平均分求每份数','div-groups-small':'平均分求份数',
 'mul-facts-large':'7～9乘法口诀','div-facts-large':'7～9口诀求商','mul-word-large':'7～9乘法应用',
 'place-compose':'三位数的组成','number-between':'三位数的大小比较','place-digit':'百十个位辨认','three-boundary':'三位数的数序与边界',
 'add-carry':'两位数进位加法','sub-borrow':'两位数退位减法','remainder':'有余数除法计算','remainder-rule':'余数与除数的关系','full-groups':'有余数除法求完整份数',
};
const mathIds:Record<number,string>={3000:'mul-groups-small',3001:'mul-word-small',3002:'mul-facts-small',3003:'mul-facts-small',3010:'div-facts-small',3011:'div-share-small',3012:'div-groups-small',3013:'div-facts-small',3020:'mul-facts-large',3021:'div-facts-large',3022:'mul-word-large',3023:'div-facts-large',3030:'place-compose',3031:'number-between',3032:'place-digit',3033:'three-boundary',3040:'add-carry',3041:'sub-borrow',3042:'add-carry',3043:'sub-borrow',3050:'remainder',3051:'remainder-rule',3052:'remainder',3053:'full-groups'};
const poems:Record<string,string[]>={
 '登鹳雀楼':['白日依山尽','黄河入海流','欲穷千里目','更上一层楼'],
 '望庐山瀑布':['日照香炉生紫烟','遥看瀑布挂前川','飞流直下三千尺','疑是银河落九天'],
 '江雪':['千山鸟飞绝','万径人踪灭','孤舟蓑笠翁','独钓寒江雪'],
 '敕勒歌':['敕勒川','阴山下','天似穹庐','笼盖四野','天苍苍','野茫茫','风吹草低见牛羊'],
};
// Original sentence contexts, never textbook prose. Pinyin disambiguates exact spelling.
const meanings:Record<string,[string,string,string]>={
 '池塘':['比湖小、可以养鱼的一片水','____里有小鱼在游。','放学后，我看见____边开了花。'],
 '眼睛':['人用来看东西的器官','读书时要保护好____。','小猫睁大____看着我。'],
 '变化':['事物与原先不一样了','这里的景色发生了____。','我记录下种子每天的____。'],
 '水滴':['很小的一滴水','叶子上有一颗晶亮的____。','一颗____从屋檐落下来。'],
 '种子':['能在合适条件下长成新植物的部分','我们把____种进花盆。','这颗____已经发芽了。'],
 '办法':['解决问题的方法','遇到困难先想____。','大家一起想出了好____。'],
 '小桥':['不大的桥','我们走过一座____。','河上有一座弯弯的____。'],
 '队旗':['代表队伍的旗子','同学们举起了____。','____在操场上迎风飘扬。'],
 '杨树':['一种常见的树木，名称读yáng shù','路旁种着一排____。','我在____下乘凉。'],
 '树叶':['长在树枝上的叶子','秋天，____慢慢变黄了。','风把一片____吹到地上。'],
 '朋友':['彼此关系友好的人','我和____一起看书。','我把好消息告诉了____。'],
 '动物':['能运动、摄取食物的生物的一大类','我们要爱护小____。','图画里有许多____。'],
 '农田':['种植农作物的田地','爷爷在____里劳动。','雨后的____充满生机。'],
 '四季':['春夏秋冬的合称','家乡的____各有不同。','这本书介绍了一年____。'],
 '彩虹':['雨后天空有时出现的七色圆弧','雨后，天边出现了____。','小朋友画了一道____。'],
 '雨后':['下过雨之后','____，空气格外清新。','____的叶子显得更绿了。'],
 '外婆':['妈妈的妈妈','周末，我们去看望____。','____给我讲了一个故事。'],
 '路上':['行走途中','回家的____，我遇见了同学。','上学____，我们遵守交通规则。'],
 '星星':['夜空中常能看到的发光小点','夜空中有许多____。','我和爸爸一起数____。'],
 '孩子':['年龄小的人','这些____正在认真读书。','院子里传来____们的笑声。'],
 '白日':['白天，也可在古诗中指太阳','____与黑夜交替出现。','古诗补词：____依山尽。'],
 '黄河':['名称读huáng hé的一条大河','我从地图上找到了____。','画纸上，一条河被标成____。'],
 '香炉':['焚香所用的器具','展柜里陈列着一个古老的____。','画中的桌上放着一只____。'],
 '瀑布':['从陡峭处直流而下的水','远处的____发出哗哗声。','我们站在安全的地方欣赏____。'],
 '山峰':['山的顶端或高耸的山体','远处的____被云遮住了。','画面上有一座高高的____。'],
 '石头':['组成岩石的坚硬物体的通称','路边有一块圆圆的____。','我把____画成了一只小兔。'],
 '清晨':['太阳升起前后的一段时间','____，鸟儿开始唱歌。','____的校园安安静静。'],
 '风景':['可供观赏的自然或人文景物','窗外的____很美。','我用画笔记录家乡的____。'],
 '葡萄':['成串生长、可食用的一种水果','架子上挂着一串串____。','妈妈洗了一盘____。'],
 '丰收':['农作物收成很好','果园里迎来了____。','农民脸上露出了____的喜悦。'],
 '井沿':['水井口的边缘','故事中的青蛙坐在____上。','图画里有一圈圆圆的____。'],
 '无边':['没有边际或看不到边际','草原辽阔____。','天空____，让人充满想象。'],
 '寒冷':['温度很低，让人觉得冷','____的冬天到了。','____的天气里要注意保暖。'],
 '将来':['现在以后的时间','我想____成为一名画家。','我们为____的小活动作准备。'],
 '葫芦':['一种果实常有上下两个鼓起部分的植物','架子上结出了小____。','我画了一个圆圆的____。'],
 '叶子':['植物中通常呈绿色片状的部分','树上的____摇来摇去。','一片____轻轻落下。'],
 '夜晚':['天黑以后的一段时间','____，星光洒满天空。','安静的____，我听到虫鸣。'],
 '灯光':['灯发出的光','暖暖的____照着书本。','窗里透出了柔和的____。'],
 '扁担':['挑东西时搭在肩上的长条工具','叔叔用____挑起两个篮子。','这根____被放在墙边。'],
 '劳动':['人们动手或动脑创造成果的活动','大家一起参加____。','____之后，我们把工具收好。'],
 '难忘':['很难忘记','这真是一次____的旅行。','老师的鼓励令我____。'],
 '欢乐':['快乐、喜悦','操场上响起____的笑声。','大家度过了____的一天。'],
 '年轻':['年龄不大','这位老师很____。','____的叔叔正在认真工作。'],
 '勇敢':['有勇气、不怕困难','小明____地举起了手。','面对困难，我们要____。'],
 '江雪':['江面上的雪景，也是古诗的篇名','这幅画的名字叫《____》。','今天我们学习古诗《____》。'],
 '小舟':['不大的船','河上有一叶____。','画中，一只____停在岸边。'],
 '草原':['长着大片草的原野','马儿在____上奔跑。','辽阔的____一望无际。'],
 '牛羊':['牛和羊的合称','远处的____正在吃草。','牧民赶着____回家。'],
 '大雾':['很浓的雾','____遮住了远处的山。','清晨，一场____笼罩着河面。'],
 '远方':['距离很远的地方','小船慢慢驶向____。','我给____的亲人写信。'],
 '雪花':['空中降落的白色雪的结晶','一片____落在手心里。','窗外飘起了轻轻的____。'],
 '伙伴':['一起活动或相互合作的人','我和____一起完成拼图。','大家都是互相帮助的好____。'],
 '称赞':['用话语表达对别人优点的赞许','同学们____他的进步。','老师的____让我更有信心。'],
 '进步':['比原先有所提高','每天练习一点，就会有____。','我发现自己的书写有了____。'],
 '纸船':['用纸折成的船','我用彩纸折了一只____。','弟弟把小小的____放在桌上。'],
 '风筝':['利用风力升空、通常用线牵引的玩具','春天，我们去空地放____。','这只____画着美丽的花纹。'],
 '快乐':['高兴、愉快','帮助别人使我感到____。','祝你度过____的一天。'],
 '小河':['不宽大的河流','一条____从村边流过。','____里的水清清的。'],
};
export function focusFor(question: FamilyQuestion): Focus {
  const source=question.weekly ? BANK.find(q=>q.id===question.weekly!.sourceId)??question : question;
  // Locally imported questions have no authored variant pool. Keep the original
  // mistake visible, group it by its workbook knowledge point, and never claim mastery.
  if(source.origin==='local') {
    const label=source.knowledge_point||source.unit||'本地题库题';
    return {key:`local:${source.subject}:${label}`,label:`${label}（本地题库）`,subject:source.subject,source,supported:false,note:'这是家长从练习册导入的本地题目，目前不参与自动变式或隔日复测。可以先订正原题；自动巩固仍只覆盖内置题库的语文词语/古诗和数学计算技能。'};
  }
  const math=mathIds[source.id];
  if(source.subject==='数学'&&math) return {key:`math:${math}`,label:names[math],subject:'数学',source,supported:true,note:'换数字或情境，练习同一个运算与数量关系。'};
  const poem=Object.keys(poems).find(title=>source.question.includes(`《${title}》`)&&source.mode==='dictation');
  if(poem) return {key:`poem:${poem}`,label:`《${poem}》背诵`,subject:'语文',source,supported:true,note:'用不同空位、上下句回忆，检查整首诗的背诵。'};
  const vocab=VOCABULARY.find(v=>v.word===source.answer)??(source.knowledge_point.includes('生字填空')?VOCABULARY.find(v=>v.lessonId===source.lessonId):undefined);
  if(source.subject==='语文'&&vocab&&meanings[vocab.word]) return {key:`word:${vocab.word}`,label:`“${vocab.word}”的字词默写`,subject:'语文',source,supported:true,note:'围绕同一易错字词，换词义和句子语境默写。'};
  return {key:`custom:${source.id}`,label:source.knowledge_point||'家长补充题',subject:source.subject,source,supported:false,note:'这道补充题还没有配套变式题。可先订正原题，再由家长补充同类题；暂不自动判断掌握情况。'};
}
function hash(text:string):number {let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0)+10000000;}
export function signature(q:FamilyQuestion):string {return q.weekly?.signature??`${q.question.replace(/\s+/g,'')}|${q.answer.normalize('NFKC').trim()}`;}

/** Rule-authored pools. Assigned signatures are reserved across both phases. */
export function variants(focus:Focus,stage:'practice'|'check'):FamilyQuestion[] {
  const out:FamilyQuestion[]=[];
  const add=(question:string,answer:string,explanation:string,key:string,choice=false)=>{
    const sig=`${focus.key}:${key}`,correctIndex=hash(sig)%4;
    const values=[Number(answer)-1,Number(answer)+1,Number(answer)+2];if(choice)values.splice(correctIndex,0,Number(answer));
    const options=choice?values.map((n,i)=>`${String.fromCharCode(65+i)}. ${n}`):[];
    out.push({id:hash(sig),subject:focus.subject,type:choice?'choice':focus.subject==='数学'?'fill_blank':'fill_blank_text',...(focus.subject==='语文'?{mode:'dictation' as const}:{}),score:10,difficulty:1,options,answer:choice?String.fromCharCode(65+correctIndex):answer,question,explanation,knowledge_point:focus.label,lessonId:focus.source.lessonId,weekly:{key:focus.key,label:focus.label,sourceId:focus.source.id,stage,signature:sig}});
  };
  if(focus.key.startsWith('word:')) {
    const word=focus.key.slice(5),v=VOCABULARY.find(v=>v.word===word)!,[meaning,a,b]=meanings[word];
    const prompts=stage==='practice'?
      [`根据意思默写词语：${meaning}。（${v.pinyin}）`,`把句子补充完整：${a}（${v.pinyin}）`,`看拼音，在新句子中写词语：${b}（${v.pinyin}）`,`把学过的词写完整：${word[0]}____（填完整词语，${v.pinyin}）`]:
      [`独立默写：${meaning}。请写出读音为 ${v.pinyin} 的完整词语。`,`新语境默写：${b}（写完整词语，${v.pinyin}）`,`回忆词语：用 ${v.pinyin} 这个词填入“${a}”。`,`词语复测：请写出读音 ${v.pinyin} 对应的词语，再与句意“${meaning}”核对。`];
    prompts.forEach((prompt,i)=>add(prompt,word,`词语是“${word}”，读 ${v.pinyin}。注意易错字在整个词里的写法。`,`${stage}-word-${i}`));
    return out;
  }
  if(focus.key.startsWith('poem:')) {
    const title=focus.key.slice(5),lines=poems[title];
    lines.forEach((line,i)=>{
      if(stage==='practice') add(`古诗换位填空：《${title}》中，“${line.slice(0,2)}____”。请默写横线缺少的部分。`,line.slice(2),`完整诗句是“${line}”。先理解画面，再连起来背。`,`poem-part-${i}`);
      else add(`背诵复测：《${title}》的第 ${i+1} 句是什么？请独立写出完整诗句。`,line,`第 ${i+1} 句为“${line}”。`,`poem-full-${i}`);
    });return out;
  }
  if(!focus.key.startsWith('math:'))return out;
  const skill=focus.key.slice(5), large=skill.includes('large');
  const start=large?7:2,end=large?9:6;
  if(skill.startsWith('mul-')||skill.startsWith('div-')) {
    for(let a=start;a<=end;a++)for(let b=2;b<=9;b++) {
      if(!large&&b>6)continue;
      const product=a*b, word=skill.includes('word'),group=skill.includes('groups'),sharing=skill.includes('share');
      if(skill.startsWith('mul')) add(word?`每袋有 ${a} 个小球，${b} 袋共有多少个？（填数字）`:group?`${b} 个 ${a} 相加，结果是多少？`:`算一算：${a} × ${b} = ____`,String(product),`${a} × ${b} = ${product}。每份数与份数相乘得到总数。`,`${Math.min(a,b)}-${Math.max(a,b)}`,out.length%2===1);
      else add(sharing?`${product} 张卡片平均分给 ${b} 人，每人有几张？`:group?`${product} 本书，每 ${b} 本一组，一共能分成几组？`:`算一算：${product} ÷ ${b} = ____`,String(a),`${b} × ${a} = ${product}，所以 ${product} ÷ ${b} = ${a}。`,`${product}-${b}`,out.length%2===1);
    }
  } else if(skill==='add-carry'||skill==='sub-borrow') {
    for(let a=21;a<=65;a+=4)for(let b=12;b<=29;b+=3){
      if(skill==='add-carry'&&a%10+b%10>=10&&a+b<100)add(`${a} + ${b} = ____`,String(a+b),'相同数位对齐，个位满十向十位进 1。',`${a}+${b}`,out.length%2===1);
      if(skill==='sub-borrow'&&a>b&&a%10<b%10)add(`${a} − ${b} = ____`,String(a-b),'个位不够减时，从十位退 1 作 10，再计算。',`${a}-${b}`,out.length%2===1);
    }
  } else if(skill==='remainder'||skill==='full-groups') {
    for(let d=3;d<=8;d++)for(let q=2;q<=6;q++)for(let r=1;r<d;r++){
      const n=d*q+r;
      add(skill==='remainder'?`${n} ÷ ${d} = ${q}……____`:`${n} 支笔，每盒放 ${d} 支，最多可以装满几盒？`,String(skill==='remainder'?r:q),`${n} = ${d} × ${q} + ${r}，余数 ${r} 小于除数 ${d}。`,`${n}/${d}`,out.length%2===1);
    }
  } else if(skill==='remainder-rule') {
    for(let d=3;d<=9;d++){
      add(`在有余数的除法里，除数是 ${d}，余数最大是几？`,String(d-1),`余数必须小于除数 ${d}，所以最大是 ${d-1}。`,`max-${d}`);
      add(`一个有余数的除法算式，余数是 ${d-1}，除数最小是几？`,String(d),`除数必须大于余数 ${d-1}，所以最小是 ${d}。`,`min-${d}`);
    }
  } else if(skill==='place-compose'||skill==='place-digit'||skill==='number-between') {
    for(let h=1;h<=7;h++)for(let t=1;t<=8;t+=2){const u=(h+t)%9+1;const n=h*100+t*10+u;
      add(skill==='place-compose'?`${h} 个百、${t} 个十和 ${u} 个一，合起来是多少？`:skill==='place-digit'?`${n} 的十位上的数字是几？`:`比 ${n-1} 大、比 ${n+1} 小的整数是多少？`,String(skill==='place-digit'?t:n),`${n} 由 ${h} 个百、${t} 个十和 ${u} 个一组成。`,`${n}`,out.length%2===1);
    }
  } else if(skill==='three-boundary') {
    const rows: [string,string,string][] = stage==='practice'?
      [['最大的两位数加 1 是多少？','100','99 + 1 = 100。'],['最小的四位数减 1 是多少？','999','1000 − 1 = 999。'],['比 998 大 1 的数是多少？','999','998 + 1 = 999。'],['最小的三位数比 99 大多少？','1','100 − 99 = 1。']]:
      [['最小的三位数是多少？','100','三位数从 100 开始。'],['比 1000 小 1 的数是多少？','999','1000 − 1 = 999。'],['比 99 大 2 的数是多少？','101','99 + 2 = 101。'],['最大的三位数比 1000 小多少？','1','1000 − 999 = 1。']];
    rows.forEach(([p,a,e],i)=>add(p,a,e,`${stage}-boundary-${i}`));
  }
  const anchors:Record<number,[number,number]>={3000:[4,3],3001:[6,3],3002:[4,5],3003:[6,6],3010:[6,4],3011:[4,3],3012:[3,6],3013:[6,5],3020:[7,8],3021:[8,9],3022:[9,6],3023:[9,7]};
  const anchor=anchors[focus.source.id];
  if(anchor)out.sort((a,b)=>{
    const distance=(q:FamilyQuestion)=>{let [x,y]=q.weekly!.signature.split(':').at(-1)!.split('-').map(Number);if(skill.startsWith('mul')){const nums=q.question.match(/\d+/g)!.map(Number);[x,y]=skill.includes('groups')?[nums[1],nums[0]]:[nums[0],nums[1]];}if(skill.startsWith('div'))x/=y;return Math.abs(x-anchor[0])*10+Math.abs(y-anchor[1]);};
    return distance(a)-distance(b);
  });
  const unique=new Set<string>();
  return out.filter(q=>{const sig=signature(q);if(unique.has(sig))return false;unique.add(sig);return true;});
}
