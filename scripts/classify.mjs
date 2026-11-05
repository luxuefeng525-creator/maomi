#!/usr/bin/env node
// ai-workflow 定档：输入一句话需求，输出 L0/L1/L2 与依据。零依赖。
// 用法：node scripts/classify.mjs "<需求>"
const text = (process.argv.slice(2).join(' ') || '').toLowerCase();

const forceL0 = /小改|单行|只改一行|别动别的|改几个字|微调/.test(text);
const forceL2 = /做功能|完整做|走全流程|全链|端到端|新项目|架构|选型/.test(text);

const l2 = [
  '跨端', '跨模块', '改接口', '对外接口', '数据模型', '数据库', '改表', '迁移',
  '新页面', '新路由', '新模块', '≥5', '大于5', '五个文件', '重构', '微服务',
  '拆解', '拆分', '并行', '子代理', '模块化', '分模块'
];
const l1 = ['单模块', '单端', '修bug', '修复', '补丁', '小功能', '加一个', '优化', '性能回归'];

let tier = 'L0';
let reason = '默认快改：单文件小改动';
const hits = [];

if (forceL0) { tier = 'L0'; reason = '用户明示小改/单行'; }
else if (forceL2) { tier = 'L2'; reason = '用户明示做功能/全链/选型'; }
else {
  for (const k of l2) if (text.includes(k.toLowerCase())) hits.push(k);
  for (const k of l1) if (text.includes(k.toLowerCase())) hits.push(k);
  if (hits.some(h => l2.includes(h))) {
    tier = 'L2';
    reason = `命中升档信号：${hits.filter(h => l2.includes(h)).join('/')}`;
  } else if (hits.length) {
    tier = 'L1';
    reason = `命中标准信号：${hits.join('/')}`;
  }
}

const rings = tier === 'L2' ? '全8环' : tier === 'L1' ? '环3+4+5' : '环3+4';
const budget = tier === 'L2' ? '1-2个' : tier === 'L1' ? '1个' : '0个(最多surgical-patch)';

console.log(`[档位] ${tier} · ${reason} · 走${rings} · 技能预算${budget}`);
console.log(`TIER=${tier}`);
