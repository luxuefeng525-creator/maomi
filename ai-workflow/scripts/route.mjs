#!/usr/bin/env node
// ai-workflow 路由 v2：一句话意图 -> Top-K 技能（零依赖、零 LLM、跨宿主一致）。
// 用法：node scripts/route.mjs "<一句话>" [--top 3] [--min 5] [--json] [--explain]
// 设计目标（按优先级）：① 任何模型读同一份确定性信号，命中率不依赖模型语感；② 输出极短省 token。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
function opt(n, d) { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; }
const asJson = flag('--json'), explain = flag('--explain');
const TOP = Number(opt('--top', '3')), MIN = Number(opt('--min', '3'));
const query = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')))
  .join(' ').trim();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const pkgSkills = path.join(PKG, 'skills');

// ---------- 归一化：全角->半角、去标点、小写；保留原串用于负向闸门 ----------
function norm(s) {
  return s.replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ').toLowerCase();
}
const Q = norm(query);

// ---------- 目录：catalog.json（构建产物）优先，缺失则现读 SKILL.md ----------
function loadCatalog() {
  const f = path.join(PKG, 'catalog.json');
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  }
  const out = { skills: [], syncs: {}, negatives: null };
  if (!fs.existsSync(pkgSkills)) return out;
  for (const name of fs.readdirSync(pkgSkills)) {
    const sk = path.join(pkgSkills, name, 'SKILL.md');
    if (!fs.existsSync(sk)) continue;
    const txt = fs.readFileSync(sk, 'utf8');
    const fm = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const dm = fm && fm[1].match(/description:\s*([\s\S]*?)(?:\n[A-Za-z][\w-]*:|$)/);
    const tl = txt.match(/^触发词[:：]\s*(.+)$/m);
    out.skills.push({
      name,
      desc: dm ? dm[1].replace(/\s+/g, ' ').trim() : '',
      keywords: tl ? tl[1].split(/[\/|,;、，；]/).map(s => s.trim()).filter(Boolean) : [],
    });
  }
  return out;
}
const cat = loadCatalog();

// ---------- 负向闸门：结构化，不再靠单个词 ----------
// 命中任一 negative 规则且不含 build 动词 -> ROUTE_NONE（省 token）。用户点名技能时由宿主覆盖。
const NEG = [
  { id: 'text-replace', re: /(改成|改为|替换成|替换为|换成|改成「|改成『|改成"|替换)[^。]{0,20}?(「|『|"|`|'|》|《)/ },
  { id: 'text-replace-quoted', re: /(「|『|"|`)[^」』"`]{1,20}(」|』|"|`)[^。]{0,12}(改成|改为|替换成|替换为|换成)/ },
  { id: 'text-replace2', re: /(把|将)[^。]{0,24}(改成|改为|替换成|替换为)[^。]{0,24}(两个字|几个字|文字|文案|标题)/ },
  { id: 'text-replace3', re: /(两个字|几个字|这几个字|这个词|这行字|这句)[^。]{0,12}(改成|改为|替换成|替换为|换成)/ },
  { id: 'chit-chat', re: /^(为什么(?!不|会报|会崩)|怎么会|哪一年|哪天|天气|今天星期|是谁|历史|翻译|天气怎么样)/ },
  { id: 'pure-qa', re: /^(解释|说明|介绍|讲讲|说说|科普|分别是|怎么理解|什么是|什么叫|是什么|区别|为什么是)/ },
  { id: 'define', re: /(的区别|是什么意思|是什么关系|原理是|^什么是|^什么叫|概念是什么)/ },
  { id: 'handoff', re: /(提交给|发给|转给|发送给|发给老板|邮件给)/ },
  { id: 'paste', re: /(贴给我|原文贴|日志原文|把报错贴|复制给我看看)/ },
  { id: 'report', re: /(写周报|写日报|周报模板|汇报给老板)/ },
  { id: 'naming', re: /(起个名|起名|取个名|命名|叫什么名|怎么称呼|叫什么名字|起.{0,8}(名字|名称|名儿))/ },
  // 状态查询是"查"不是"改"：'这个 PR 已经合并了吗' 不该载 safe-refactor。
  { id: 'status-only', re: /(查一下|看下|看一下|帮我查)[^。]{0,8}(状态|进度|情况)|已经(合并|上线|发布|提交|部署)了?吗|(合并|上线|发布|部署)了(吗|没)/ },
];
const BUILD = /(做|建|开发|实现|重构|修复|生成|设计|搭建|迁移|部署|上线|排查|定位|诊断|验收|拆分|拆成|复现)/;
// 结构性"字面替换"永不属于技能活：不论有没有 build 动词都拦。
const HARD_NEG = new Set(['text-replace', 'text-replace2', 'text-replace-quoted', 'text-replace3']);
const negHit = query ? NEG.find(r => r.re.test(Q) && (HARD_NEG.has(r.id) || !BUILD.test(Q))) : null;
if (!query) { console.log('用法：route.mjs "<一句话>" [--top 3] [--min 5] [--json]'); process.exit(1); }
if (negHit) {
  if (asJson) console.log(JSON.stringify({ route: [], reason: 'negative:' + negHit.id, query }));
  else console.log(`ROUTE_NONE（非开发意图: ${negHit.id}，走通用纪律省 token）`);
  process.exit(0);
}

// ---------- 同义词扩展：口语 -> 技能词（提高 LLM 之外的确定性召回） ----------
const SYN = cat.syncs || {};
function expansions(q) {
  const out = new Set([q]);
  for (const [std, alts] of Object.entries(SYN)) {
    if (std.startsWith('__')) continue;
    const list = Array.isArray(alts) ? alts : [alts];
    if (q.includes(std) || list.some(a => a && q.includes(String(a).toLowerCase()))) {
      out.add(std); for (const a of list) if (a) out.add(String(a).toLowerCase());
    }
  }
  return [...out];
}
const Q_VARIANTS = expansions(Q);
// 口语填词剥离：用户说"回答简短些"而不是"简短点"。去掉不影响语义的虚词再匹配一次。
const FILLER = /(帮我|麻烦|请|一下吧|一下|看看|瞧瞧|先|这个|那个|这些|那些|这种|那种|我|你|能|可以|怎么|怎么样|一个|一些|吧|呢|啊|嘛|就|还|再|给|把|的|了|要|想|些)/g;
const Q_LOOSE = Q.replace(FILLER, '').replace(/\s+/g, '');
const Q_SPACED = [Q, ...Q_VARIANTS, Q_LOOSE].map(v => v.replace(/\s+/g, ''));
const hasKw = kk => Q_VARIANTS.some(v => v.includes(kk)) || Q_SPACED.some(v => v.includes(kk));

// 结构加成：关键词表覆盖不到的口语构式（对任何模型都成立，不靠语感）。
const BOOST = [
  { re: /(加|添加|新增|去掉|删掉)[^。]{0,12}(按钮|开关|字段|列|导出|导入|图标|提示|入口|tab)/, w: 6, tag: '构式:小改一处' },
  { re: /(位置|样式|颜色|间距|对齐|字号)[^。]{0,6}(偏|不对|错|乱|难看|改)/, w: 6, tag: '构式:样式问题' },
  { re: /(报错|崩溃|白屏|卡顿|变慢|挂了|跑不起来)[^。]{0,10}(帮我|怎么|为什么|查|看)/, w: 6, tag: '构式:故障' },
  { re: /(大屏|看板|驾驶舱|数字孪生)/, w: 8, tag: '构式:大屏' },
  { re: /(落地页|官网|品牌站|宣传页)/, w: 8, tag: '构式:落地页' },
  { re: /(工业|scada|hmi|上位机|设备|水泵|阀门|启停)/, w: 6, tag: '构式:工业' },
  { re: /(验收|证据|真的完成|自检)/, w: 7, tag: '构式:验收' },
  { re: /(子代理|并行|分工|多代理)/, w: 7, tag: '构式:并行' },
  { re: /(先定位|先查清|先查原因|看不懂|原因说不清|不确定为什么|偶发|间歇)/, w: 8, tag: '构式:先定位' },
  { re: /(规格|需求澄清|写清楚需求|需求写不清|一句话变)/, w: 8, tag: '构式:规格' },
  { re: /(追问|拷问|挑战方案|质疑|反问我)/, w: 7, tag: '构式:追问' },
  { re: /(零散想法|想法整理|整理成[^。]{0,8}清单|能开工|开得动工|理清需求)/, w: 8, tag: '构式:理需求' },
  { re: /(要不要|该不该|值不值得|拿主意|选哪(个|种)|怎么选)/, w: 8, tag: '构式:拿主意' },
  { re: /(卡住|滑不动|点不动|没反应|不响应|白屏|闪退)/, w: 7, tag: '构式:卡死' },

];
const BOOST_TARGET = {
  '构式:小改一处': ['surgical-patch'], '构式:样式问题': ['surgical-patch', 'diagnose'],
  '构式:故障': ['diagnose', 'investigate-first'], '构式:大屏': ['bigscreen-studio', 'industrial-screen'],
  '构式:落地页': ['finesse-ui'], '构式:工业': ['industrial-screen'], '构式:验收': ['verify-and-stop'],
  '构式:并行': ['cavecrew'], '构式:先定位': ['investigate-first'], '构式:规格': ['finesse-brief'], '构式:追问': ['grilling'], '构式:理需求': ['finesse-brief'], '构式:拿主意': ['product-strategist'], '构式:卡死': ['diagnose'],
};

function score(s) {
  let sc = 0; const ev = [];
  for (const k of s.keywords || []) {
    const kk = norm(k);
    if (kk.length < 2) continue;
    if (hasKw(kk)) {
      const w = kk.length >= 6 ? 9 : kk.length >= 4 ? 7 : 5;
      sc += w; ev.push(`kw:${k}+${w}`); if (ev.length > 6) break;
    }
  }
  const nm = norm(s.name);
  if (Q.includes(nm)) { sc += 9; ev.push(`name+9`); }
  else for (const part of nm.split('-')) if (part.length >= 4 && Q.includes(part)) { sc += 3; ev.push(`name:${part}+3`); break; }
  for (const b of BOOST) {
    if (b.re.test(Q) && (BOOST_TARGET[b.tag] || []).includes(s.name)) { sc += b.w; ev.push(`${b.tag}+${b.w}`); }
  }
  // 描述覆盖率：desc 是技能作者写下的"什么活归我"，是最准的口语信号。
  // 旧版最多 +2（门槛 5），等于形同虚设；改为按 2-gram 覆盖率分档给分。
  const desc = norm(s.desc || '');
  const cov = (q) => { let ov = 0; for (let i = 0; i < q.length - 1; i++) { const g = q.slice(i, i + 2); if (g.trim() && desc.includes(g)) ov++; } return ov / Math.max(1, q.length - 1); };
  const ratio = Math.max(cov(Q), Q_LOOSE.length >= 2 ? cov(Q_LOOSE) : 0);
  const bonus = ratio >= 0.55 ? 9 : ratio >= 0.45 ? 7 : ratio >= 0.35 ? 5 : ratio >= 0.25 ? 3 : 0;
  sc += bonus; if (bonus) ev.push(`desc${Math.round(ratio * 100)}%+${bonus}`);
  return { sc, ev };
}

// 变体技能（别名）默认折叠到主技能，只有用户点名时才单独出现，避免同类技能互抢。
const REDIRECT = { 'grill-me': 'grilling' };
const all = cat.skills.map(s => ({ ...s, ...score(s) }));
const byName = new Map(all.map(x => [x.name, x]));
const isAlias = x => REDIRECT[x.name] && !Q.includes(norm(x.name));
for (const x of all) {
  const tgt = isAlias(x) ? REDIRECT[x.name] : null;
  if (tgt && byName.has(tgt)) { const t = byName.get(tgt); t.sc += x.sc; t.ev.push(`alias:${x.name}+${x.sc}`); }
}
const ranked = all.filter(x => !isAlias(x) && x.sc >= MIN).sort((a, b) => b.sc - a.sc).slice(0, TOP);

if (!ranked.length) {
  // 沉默 ≠ 没有技能适用，只表示触发词表没覆盖这个说法（口语换说法的实测覆盖上限约 4 成）。
  // 所以给低分候选 + 指向派发表，让模型自己按语义判，而不是直接退回通用纪律。
  const weak = all.filter(x => !isAlias(x) && x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 3);
  if (asJson) console.log(JSON.stringify({ route: [], reason: 'no-match', candidates: weak.map(w => ({ name: w.name, score: w.sc })), next: 'references/dispatch-table.md', query }));
  else {
    console.log('ROUTE_NONE（触发词未覆盖此说法，不代表没有技能可用）');
    if (weak.length) console.log('弱候选(需自判): ' + weak.map(w => `${w.name}=${w.sc}`).join('  '));
    console.log('下一步: 读 references/dispatch-table.md 按语义自选技能；表里也没有才走通用纪律。');
  }
  process.exit(0);
}
if (asJson) {
  console.log(JSON.stringify({ query, route: ranked.map(r => ({ name: r.name, score: r.sc, load: `skills/${r.name}/SKILL.md`, evidence: explain ? r.ev : undefined })) }));
} else {
  ranked.forEach((x, i) => console.log(`${i + 1}. ${x.name} (score=${x.sc})${explain ? ' ' + x.ev.join(',') : ''}`));
}
