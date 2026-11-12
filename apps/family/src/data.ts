import type { Question } from '@cstf/core/types';
export interface FamilyQuestion extends Question { subject: '语文' | '数学'; mode?: 'dictation' | 'writing' | 'text'; lessonId?: string; weekly?: { key: string; label: string; sourceId: number; stage: 'practice' | 'check'; signature: string }; /** Questions imported by a parent stay in this browser only. */ origin?: 'local'; /** Optional workbook unit/chapter label for imported questions. */ unit?: string }
export interface Course { id: string; subject: '语文' | '数学'; title: string; section: string; edition: 'tongbian-2026' | 'sujiao-math' | 'local'; expansion: string; questions: FamilyQuestion[]; /** Imported unit size before the 12-question practice cap. */ available?: number; /** Bank that owns an imported course. */ bankId?: string }
const make = (id: number, subject: FamilyQuestion['subject'], type: Question['type'], question: string, answer: string, knowledge_point: string, explanation: string, extra: Partial<FamilyQuestion> = {}): FamilyQuestion => ({ id, subject, type, question, answer, knowledge_point, explanation, score: 10, difficulty: 1, options: [], ...extra });
// Newly authored demo exercises and expansions. Words are illustrative vocabulary,
// not an asserted official spelling list. No modern textbook passage is reproduced.
type ChineseRow = [string, string, string, string, string, string, string];
const current: ChineseRow[] = [
  ['小蝌蚪找妈妈','池塘','chí táng','眼睛','yǎn jing','青蛙的成长经历卵、蝌蚪、幼蛙和成蛙几个阶段，身体会不断变化。','池塘里，小蝌蚪甩着尾巴游来游去。'],
  ['我是什么','变化','biàn huà','水滴','shuǐ dī','水受热可以蒸发，遇冷可以凝结。可以在大人陪伴下观察杯壁的小水珠。','小水滴聚在一起，变成一颗亮亮的珠子。'],
  ['植物妈妈有办法','种子','zhǒng zi','办法','bàn fǎ','种子可以借助风、水、动物等传播。想想种子的形状有什么作用。','小种子坐着风，飞向远处的田野。'],
  ['场景歌','小桥','xiǎo qiáo','队旗','duì qí','量词帮助我们把事物说具体，比如一棵树、一朵花。','一条小河，一座石桥，一群快乐的小鸟。'],
  ['树之歌','杨树','yáng shù','树叶','shù yè','可以根据树皮、树叶和树形区分常见树木，不要品尝未知植物。','柳树的枝条像长长的辫子。'],
  ['拍手歌','朋友','péng you','动物','dòng wù','很多与鸟有关的汉字带“鸟”或“隹”，字义还要结合具体的字判断。','鸟儿在林间唱歌，鱼儿在水里游玩。'],
  ['田家四季歌','农田','nóng tián','四季','sì jì','农事与气候、作物和地区有关，问问家人家乡不同季节种些什么。','春天播种，秋天收获，田野里总有忙碌的身影。'],
  ['彩虹','彩虹','cǎi hóng','雨后','yǔ hòu','阳光经过空气中的水滴会发生变化，在合适的条件下形成彩虹。','雨后的彩虹像一座七彩的小桥。'],
  ['去外婆家','外婆','wài pó','路上','lù shang','介绍一段路程，可以按照出发、途中和到达的顺序讲述。','去外婆家的路上，我看见了一片竹林。'],
  ['数星星的孩子','星星','xīng xing','孩子','hái zi','观察星空需要晴朗天气和安全地点，可以和家人一起观察。','一颗颗星星像小眼睛，在夜空中闪亮。'],
  ['登鹳雀楼','白日','bái rì','黄河','huáng hé','把诗中的远景和近景画出来，体会站得更高看得更远。','站在高处，我看见更远的田野。'],
  ['望庐山瀑布','香炉','xiāng lú','瀑布','pù bù','夸张可以突出景物的特点。“三千尺”表达瀑布气势，不是精确测量。','瀑布像银色的长带，从山间落下来。'],
  ['黄山奇石','山峰','shān fēng','石头','shí tou','用“像……”把不熟悉的事物与熟悉的物品联系起来。','那块石头像一只昂着头的小狮子。'],
  ['日月潭','清晨','qīng chén','风景','fēng jǐng','同一个地方在不同时间和天气里会呈现不同的颜色和光影。','清晨的湖面像一面安静的镜子。'],
  ['葡萄沟','葡萄','pú tao','丰收','fēng shōu','介绍水果可以从颜色、形状、味道和产地等角度选择特点。','一串串葡萄像晶莹的小珠子。'],
  ['坐井观天','井沿','jǐng yán','无边','wú biān','从不同位置看到的范围不同，遇到不同意见可以换个角度观察。','站在窗边和走到操场上，看到的天空不一样。'],
  ['寒号鸟','寒冷','hán lěng','将来','jiāng lái','做事前列小计划，先完成重要步骤，不把事情都留到最后。','放学后，我先整理书包，再准备明天的用品。'],
  ['我要的是葫芦','葫芦','hú lu','叶子','yè zi','叶子能帮助植物制造养分。观察植物要把叶、茎、根和果实联系起来。','叶子长得好，果实也慢慢长大了。'],
  ['八角楼上','夜晚','yè wǎn','灯光','dēng guāng','描写人物可以留意环境、动作和神态，用细节说明人物在做什么。','夜晚，灯光照着认真读书的孩子。'],
  ['朱德的扁担','扁担','biǎn dan','劳动','láo dòng','挑、抬、搬等动作词能把劳动的过程写具体。','大家抬着水桶，一步一步走向菜地。'],
  ['难忘的泼水节','难忘','nán wàng','欢乐','huān lè','介绍节日可以写时间、活动和感受，尊重不同民族的习俗。','节日里，大家唱着歌，脸上洋溢着笑容。'],
  ['刘胡兰','年轻','nián qīng','勇敢','yǒng gǎn','认识人物品质时，可以从具体言行中寻找依据。','遇到困难时，她勇敢地说出了自己的想法。'],
  ['江雪','江雪','jiāng xuě','小舟','xiǎo zhōu','读诗可以注意数量词和画面里的动静，想象雪中江面的安静。','白雪盖住了山路，江面上有一只小船。'],
  ['敕勒歌','草原','cǎo yuán','牛羊','niú yáng','描写辽阔的地方，可以选择天空、原野和动物等不同层次的景物。','蓝天下，草原一直伸向远方。'],
  ['雾在哪里','大雾','dà wù','远方','yuǎn fāng','雾由近地面空气中悬浮的细小水滴等形成，会影响能见度。','大雾像一层薄纱，轻轻盖住了小桥。'],
  ['雪孩子','雪花','xuě huā','伙伴','huǒ bàn','冰雪受热会融化，水在一定条件下会蒸发，物质会发生状态变化。','阳光下，小雪人的脸上挂起了水珠。'],
  ['称赞','称赞','chēng zàn','进步','jìn bù','真诚的称赞要说具体，比如指出对方哪一处做得好。','你把书放得很整齐，真有条理！'],
  ['纸船和风筝','纸船','zhǐ chuán','风筝','fēng zheng','遇到小矛盾时，先说清自己的感受，再听听对方的想法。','小纸船带着问候，顺着水流向前漂。'],
  ['快乐的小河','快乐','kuài lè','小河','xiǎo hé','保护身边的河流可以从不乱扔垃圾、节约用水开始。','小河唱着歌，轻快地流向远方。'],
];
const poetry: Record<string,[string,string]> = {
  '英英学古诗':['《静夜思》：床前明月光，________。','疑是地上霜'],
  '登鹳雀楼':['《登鹳雀楼》：欲穷千里目，________。','更上一层楼'],
  '望庐山瀑布':['《望庐山瀑布》：飞流直下三千尺，________。','疑是银河落九天'],
  '江雪':['《江雪》：孤舟蓑笠翁，________。','独钓寒江雪'],
  '敕勒歌':['《敕勒歌》：天苍苍，野茫茫，________。','风吹草低见牛羊'],
};
function chinese(rows: ChineseRow[], edition: Course['edition'], start: number): Course[] {
  return rows.map(([title,w1,p1,w2,p2,expansion,example],i) => {
    const id=`${edition}-${i+1}`, base=start+i*10;
    const questions: FamilyQuestion[] = [
      make(base+1,'语文','fill_blank_text',`看拼音，默写词语：${p1}`,w1,`${title} · 词语默写`,`词语写作“${w1}”。请对照检查每一个字。`,{mode:'dictation',lessonId:id}),
      make(base+2,'语文','fill_blank_text',`看拼音，默写词语：${p2}`,w2,`${title} · 词语默写`,`词语写作“${w2}”。注意同音字，结合意思辨认。`,{mode:'dictation',lessonId:id}),
      make(base+3,'语文','fill_blank_text',`把词语补充完整：${w1[0]}____`,w1.slice(1),`${title} · 生字填空`,`完整词语是“${w1}”。`,{lessonId:id}),
    ];
    if(poetry[title]) questions.push(make(base+4,'语文','fill_blank_text',poetry[title][0],poetry[title][1],`${title} · 古诗背诵片段`,'先理解诗句的画面，再按原句准确默写。标点和空格不计。',{mode:'dictation',lessonId:id}));
    questions.push(make(base+5,'语文','fill_blank_text',`仿写拓展：围绕《${title}》的主题，写一句自己的话。`,example,`${title} · 仿写拓展`,'仿写没有唯一答案。想想有没有写清楚“谁、在哪里、做什么”，给家长读一读。',{mode:'writing',score:0,lessonId:id}));
    return {id,subject:'语文',title,section:`第 ${i+1} 篇`,edition,expansion,questions};
  });
}
type MathItem=[string,string,string,string[]?];
const mathRows:[string,string,MathItem[]][]=[
  ['1～6的表内乘法','几个相同的数相加，可以用乘法。把每份数、份数和总数联系起来理解口诀。',[
    ['3 个 4 相加，结果是多少？','12','4 + 4 + 4 = 12，也就是 3 × 4 = 12。'],
    ['每盒 6 支铅笔，3 盒共有多少支？','B','6 × 3 = 18（支）。',['A. 9 支','B. 18 支','C. 12 支','D. 24 支']],
    ['补充口诀：四五____。（填数字）','20','四五二十，4 × 5 = 20。'],['算一算：6 × 6 = ____','36','六六三十六。']]],
  ['1～6的表内除法','平均分要每份同样多。可以借助乘法口诀求商，再用乘法检查。',[
    ['24 ÷ 4 = ____','6','因为 4 × 6 = 24，所以 24 ÷ 4 = 6。'],
    ['12 个苹果平均放进 3 个盘子，每盘放几个？','C','12 ÷ 3 = 4（个）。',['A. 2 个','B. 3 个','C. 4 个','D. 6 个']],
    ['18 支笔，每 6 支放一盒，可以装几盒？','3','18 ÷ 6 = 3（盒）。'],['30 ÷ 5 = ____','6','五六三十，商是 6。']]],
  ['7～9的表内乘除法','用熟悉的口诀，把相应的乘法和除法连成一组。',[
    ['7 × 8 = ____','56','七八五十六。'],['72 ÷ 9 = ____','8','八九七十二，所以商是 8。'],
    ['每排坐 9 人，6 排可以坐多少人？','B','9 × 6 = 54（人）。',['A. 45 人','B. 54 人','C. 63 人','D. 15 人']],['63 ÷ 7 = ____','9','七九六十三。']]],
  ['认识三位数','三位数由百、十、个组成。哪一位上有几，就表示几个这样的计数单位。',[
    ['3 个百、2 个十和 5 个一，合起来是____。','325','300 + 20 + 5 = 325。'],
    ['下面哪个数比 408 大，比 415 小？','C','412 在 408 和 415 之间。',['A. 406','B. 408','C. 412','D. 418']],
    ['670 中，十位上的数字是____。','7','从右往左是个位、十位、百位，十位数字是 7。'],['最大的三位数是____。','999','三位数最大为 999。']]],
  ['两位数加、减两位数','竖式计算时相同数位对齐；个位满十向十位进一，不够减时向十位借一。',[
    ['37 + 25 = ____','62','个位 7 + 5 = 12，向十位进 1，结果为 62。'],['80 − 36 = ____','44','先减 30 得 50，再减 6 得 44。'],
    ['下面哪个算式的结果是 56？','A','28 + 28 = 56。',['A. 28 + 28','B. 70 − 24','C. 36 + 30','D. 90 − 44']],['65 − 28 = ____','37','先减 20 得 45，再减 8 得 37。']]],
  ['有余数的除法','不能正好分完时，会有剩余。余数必须小于除数，否则还能再分一份。',[
    ['14 个苹果，每 4 个装一袋，装满 3 袋后还剩几个？','2','14 − 4 × 3 = 2（个）。'],
    ['一道除法题的除数是 5，余数可能是哪个数？','B','余数必须小于 5，所以可以是 4。',['A. 5','B. 4','C. 6','D. 8']],
    ['23 ÷ 6 = 3……____','5','6 × 3 = 18，23 − 18 = 5。'],['17 个球，每盒装 5 个，最多能装满几盒？','3','5 × 3 = 15，还余 2 个，所以装满 3 盒。']]],
];
const math:Course[]=mathRows.map(([title,expansion,items],i)=>{
  const id=`sujiao-math-${i+1}`;
  return {id,title,subject:'数学',section:`第 ${i+1} 单元`,edition:'sujiao-math',expansion,questions:items.map(([prompt,answer,explanation,options],j)=>make(3000+i*10+j,'数学',options?'choice':'fill_blank',prompt,answer,title,explanation,{options:options??[],lessonId:id}))};
});
export const COURSES:Course[]=[...chinese(current,'tongbian-2026',2000),...math];
export const BANK=COURSES.flatMap(c=>c.questions);
export const VOCABULARY=current.flatMap(([title,w1,p1,w2,p2],i)=>[{word:w1,pinyin:p1,title,lessonId:`tongbian-2026-${i+1}`},{word:w2,pinyin:p2,title,lessonId:`tongbian-2026-${i+1}`}]);
const demoChinese=COURSES.find(c=>c.edition==='tongbian-2026'&&c.title==='登鹳雀楼')!;
export const TEMPLATES=[
  {id:'mixed',name:'二上语数小练习',note:'古诗默写 + 乘法基础',minutes:10,ids:[...demoChinese.questions.map(q=>q.id),3000,3001,3002]},
  {id:'chinese',name:'登鹳雀楼 · 默写与仿写',note:'生字词、古诗片段与仿写',minutes:8,ids:demoChinese.questions.map(q=>q.id)},
  {id:'math',name:'苏教二上 · 表内乘法',note:'选择题与数字填空',minutes:6,ids:math[0].questions.map(q=>q.id)},
];
export const typeName=(q:FamilyQuestion)=>q.mode==='writing'?'仿写拓展':q.mode==='dictation'?'默写':q.mode==='text'?'填写':q.type==='choice'?'选择':'填空';
export const editionName=(edition:Course['edition'])=>edition==='tongbian-2026'?'统编语文 · 上游2026秋版目录':edition==='local'?'家长本地题库 · 仅本浏览器':'苏教数学 · 新课标单元参考';
