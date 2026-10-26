#!/usr/bin/env node
/**
 * 注入预算器：把多段上下文按优先级装进字符预算，超出的段落截断或丢弃。
 *
 * 用途：SessionStart 注入、任务交接、把「全量状态」压成「预算内状态」。
 * 不做对话历史压缩——那是宿主职责，Agent 不能替它裁上下文。
 *
 * 段落结构：{ name, text, priority, ref }
 * - priority=1 为必需段，预算再紧也保留（会统计 overflow）。
 * - priority 数字越小越先装；装不下的低优先级段直接丢弃。
 * - 单段超预算时按行截断，并附 `…（截断）完整见 <ref>`。
 *
 * 用法：
 *   node scripts/context-budget.mjs --sections <sections.json> [--budget 4000] [--json]
 *   也支持 stdin 直接喂 sections JSON。
 */
import fs from 'node:fs';

/**
 * 按优先级把段落装进预算。
 * @param {Array<{name?:string,text:string,priority?:number,ref?:string}>} sections 段落
 * @param {number} budget 字符预算
 * @returns {{text:string,used:number,kept:number,dropped:number,truncated:number,overflow:number}}
 */
export function fitSections(sections, budget) {
  const limit = Math.max(50, Number(budget) || 4000);
  const list = (sections || []).map((s, i) => ({
    name: s.name || 'S' + (i + 1),
    text: String(s.text || '').replace(/\s+$/, ''),
    priority: Number(s.priority || 3),
    ref: s.ref || '',
    order: i,
  })).sort((a, b) => a.priority - b.priority || a.order - b.order);

  const parts = [];
  let used = 0;
  let kept = 0;
  let dropped = 0;
  let truncated = 0;
  let overflow = 0;

  for (const s of list) {
    if (!s.text) continue;
    const sep = parts.length ? 1 : 0; // 段间换行
    const need = s.text.length + sep;
    const must = s.priority === 1;
    const remaining = limit - used;

    if (need <= remaining) {
      parts.push(s.text);
      used += need;
      kept++;
      continue;
    }
    // 必需段完整保留，超出预算如实计入 overflow
    if (must) {
      parts.push(s.text);
      used += need;
      kept++;
      overflow = Math.max(overflow, used - limit);
      continue;
    }
    if (remaining <= 24) { dropped++; continue; }

    const marker = `\n…（截断）完整见 ${s.ref || s.name}`;
    const room = Math.max(0, remaining - sep - marker.length);
    const cut = room > 0 ? s.text.slice(0, room) : '';
    const at = cut.lastIndexOf('\n');
    const body = (at > 20 ? cut.slice(0, at) : cut).replace(/\s+$/, '');
    parts.push(body ? body + marker : marker.trim());
    used = Math.min(limit, used + sep + body.length + marker.length);
    kept++;
    truncated++;
  }

  return { text: parts.join('\n'), used, kept, dropped, truncated, overflow };
}

function main() {
  const args = process.argv.slice(2);
  const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
  const file = getArg('sections');
  let raw = '';
  if (file) raw = fs.readFileSync(file, 'utf8');
  else if (!process.stdin.isTTY) raw = fs.readFileSync(0, 'utf8');
  if (!raw.trim()) { console.error('缺少段落：--sections <json> 或 stdin'); process.exit(1); }
  let sections;
  try { sections = JSON.parse(raw); }
  catch (e) { console.error('段落 JSON 非法: ' + e.message); process.exit(1); }

  const budget = Number(getArg('budget') || 4000);
  const r = fitSections(sections, budget);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ budget, ...r }, null, 2));
    return;
  }
  console.log(r.text);
  console.error(`BUDGET chars=${r.used}/${budget} kept=${r.kept} dropped=${r.dropped} truncated=${r.truncated}${r.overflow ? ' overflow=' + r.overflow : ''}`);
}

const isMain = process.argv[1] && /context-budget\.mjs$/.test(process.argv[1]);
if (isMain) main();
