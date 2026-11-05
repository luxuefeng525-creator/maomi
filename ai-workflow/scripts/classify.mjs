#!/usr/bin/env node
// ai-workflow 定档 v2：一句话需求 -> L0/L1/L2（确定性规则 + 产出物识别，零 LLM）。
// 用法：node scripts/classify.mjs "<需求>" [--json]
// 原则：默认 L1（不默认 L0 —— L0 会跳过脚本与审查，判错代价最大）；L0 必须由"微改信号"显式触发。
const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const text = argv.filter(a => !a.startsWith('--')).join(' ').toLowerCase();

const R = {
  // 明确微改：只动一处、只改字面
  micro: /(只改一行|单行|改几个字|改两个字|改个文案|改个标题|别动(其他|别的)|只动这(一|个)|微调)/,
  // 明确大改
  big: /(新项目|从零|架构|选型|技术方案|跨端|跨模块|多模块|全流程|端到端|数据模型|数据库|改表|迁移|微服务|重构|拆分|拆解|并行改|升级[^。]{0,14}(到|至)|版本升级|大版本|破坏性|breaking|兼容性|前后端|重做|推翻重来|整个[^。]{0,6}(重做|重写|重构)|(换成|切换成|迁移到)[^。]{0,20}(支付|支付宝|微信|数据库|mysql|redis))/,
  // 纯文字编辑（文案/标题/错别字）：只在没有构建与重产出时降为 L0
  textEdit: /((改|换|调|更新|优化|修)[^。]{0,6}(文案|标题|字样|错别字|措辞|提示语)|(文案|标题|字样)[^。]{0,4}(改|换|调))/,
  // 危险/不可逆：任何档位都要停
  risk: /(删除|删掉|drop|强推|force push|回滚生产|清库|覆盖生产)/,
  // 动词
  build: /(做|建|开发|实现|搭建|生成|设计|重构|迁移|上线|部署|接入|集成|改造|重写)/,
  // 产出物（多文件/重活）
  heavy: /(大屏|数据看板|数字孪生|落地页|官网|后台|工作台|控制台|小程序|h5|app|仪表盘|管理端|系统|平台|装配线)/,
  mid: /(页面|界面|表单|弹窗|路由|接口|api|组件|模块|脚本|服务|表结构|工作流|爬虫|报表|图表)/,
  fix: /(报错|异常|崩溃|失败|不工作|无法|报错信息|性能|慢|卡|回归|bug|修复|排查|根因|为什么)/,
  test: /(单元测试|e2e|端到端测试|补测试|测试用例|断言)/,
  verifyOnly: /(验收|收尾|完成了吗|是否真的完成|给我证据|自检)/,
  // 字面编辑/非开发元请求：不升档
  literal: /(改成|改为|替换成|替换为|换成|贴给我|原文贴|解释一下|是什么意思|的区别|写周报)/,
  outputSkill: /(大屏|数据看板|数字孪生|落地页|官网|后台|工作台|控制台|scada|hmi|上位机|工业|视频|宣传片|片头)/,
};
const hit = k => R[k].test(text);
const why = [];

let tier, reason;
if (hit('literal') && !hit('big')) { tier = 'L0'; reason = '字面/元请求（替换、贴原文、问答、写周报）：不载技能'; }
else if (hit('textEdit') && !hit('heavy') && !hit('build')) { tier = 'L0'; reason = '纯文字编辑（文案/标题），不动代码结构'; }
else if (hit('micro')) { tier = 'L0'; reason = '明示微改（单点/字面）'; }
else if (hit('verifyOnly')) { tier = 'L1'; reason = '仅验收（不扩范围，但仍需证据）'; }
else if (hit('big')) { tier = 'L2'; reason = '升档信号：架构/重构/迁移/多模块'; }
else if (hit('heavy') && (hit('build') || hit('outputSkill'))) { tier = 'L2'; reason = '重产出物（大屏/落地页/工业屏/视频）'; }
else if (hit('fix')) { tier = 'L1'; reason = '缺陷定位/修复（单模块）'; }
else if (hit('mid') && hit('build')) { tier = 'L1'; reason = '单模块新增或改动'; }
else if (hit('test')) { tier = 'L1'; reason = '补测试（受影响的测试面）'; }
else if (hit('build')) { tier = 'L1'; reason = '有构建动作，未见多模块信号'; }
else { tier = 'L1'; reason = '无明确信号：按 L1 保守处理（L0 需显式微改）'; }

for (const k of Object.keys(R)) if (hit(k)) why.push(k);
if (hit('risk')) { if (tier === 'L0') tier = 'L1'; reason += '｜含不可逆动作，先停等确认'; }

const rings = tier === 'L2' ? '全8环' : tier === 'L1' ? '环3+4+5' : '环3+4';
const budget = tier === 'L2' ? '1-2个过程技能+产出必载' : tier === 'L1' ? '1个过程技能+产出必载' : '0个(最多 surgical-patch)';
const gate = tier === 'L2' ? '全量测试+构建 / 两阶段审查 / 1920x1080 截图'
  : tier === 'L1' ? '受影响测试 / 只读审查 / UI 截关键页'
    : '类型或聚焦测试 / 自审 diff';

if (asJson) {
  console.log(JSON.stringify({ tier, reason, signals: why, rings, budget, gate, risk: hit('risk') }));
} else {
  console.log(`[档位] ${tier} · ${reason} · 走${rings} · 技能预算${budget}`);
  console.log(`[闸门] ${gate}${hit('risk') ? ' · 含不可逆动作：先停' : ''}`);
  console.log(`TIER=${tier}`);
}
