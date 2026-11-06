#!/usr/bin/env node
// 构建 catalog.json + references/dispatch-table.md（机器/模型共用的一页式技能索引）。
// 用法：node scripts/build-catalog.mjs [--check]
// 产物：catalog.json（route.mjs 用，不进模型上下文）、references/dispatch-table.md（≤40 行，模型可整读，约 3KB）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const skillsDir = path.join(PKG, 'skills');
const check = process.argv.includes('--check');

const trig = JSON.parse(fs.readFileSync(path.join(HERE, 'triggers.json'), 'utf8'));
const reqMap = trig.__requires || {};
const meta = {};
for (const name of fs.readdirSync(skillsDir)) {
  const f = path.join(skillsDir, name, 'SKILL.md');
  if (!fs.existsSync(f)) continue;
  const txt = fs.readFileSync(f, 'utf8');
  const fm = (txt.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [, ''])[1];
  let desc = (fm.match(/description:\s*([\s\S]*?)(?:\n[a-zA-Z][\w-]*:|\n*$)/) || [, ''])[1]
    .replace(/^[\s'"|>]+/, '').replace(/\s+/g, ' ').trim();
  const when = (fm.match(/when_to_use:\s*(.+)/) || [, ''])[1].trim();
  desc = String(desc).trim().replace(/^['"]|['"]$/g, '').replace(/\s+/g, ' ').trim();
  meta[name] = { name, desc: desc.slice(0, 200), when };
}

const skills = Object.keys(meta).sort().map(n => ({
  name: n,
  keywords: (trig[n] || []).slice(0, 24),
        ...( (trig[n]||[]).length > 24 ? { _dropped: (trig[n]||[]).length - 24 } : {} ),
  desc: meta[n].desc,
  needs: (reqMap[n] && reqMap[n].needs) || [],
}));
// 产物必须只由 skills/ 与 triggers.json 决定：早先这里嵌了 SKILL.md 的 version 和
// 当天日期，导致 (a) 改版本号就得重建 catalog，code 与 docs 无法各自成提交；
// (b) 隔天重跑 --check 必假报 stale。两者都无消费方，一并去掉。
const catalog = { skills, syncs: trig.__synonyms || {}, negatives: trig.__negative_intents || null };

if (check) {
  // 按内容比，不按字节比：core.autocrlf=true 的机器 checkout 出来是 CRLF，
  // 逐字节比较会让这个闸门对任何 Windows 默认配置假红。
  const lf = (t) => String(t).replace(/\r\n/g, '\n');
  const old = path.join(PKG, 'catalog.json');
  const same = fs.existsSync(old) && lf(fs.readFileSync(old, 'utf8')) === lf(JSON.stringify(catalog, null, 2));
  console.log(same ? 'CATALOG OK (up to date)' : 'CATALOG STALE: run node scripts/build-catalog.mjs');
  process.exit(same ? 0 : 1);
}

fs.writeFileSync(path.join(PKG, 'catalog.json'), JSON.stringify(catalog, null, 2));

// 派发表是路由器沉默时的语义兜底层。读者是模型，不是打分器：
// 给整句人话（作者原 description）比给 6 个截断关键词更能判语义；
// 但"用于 …"才是触发语，长 description 必须保住它，不能被截断切掉。
function whenToUse(s) {
  let d = (s.desc || '')
    .replace(/触发\s*\/[\w-]+[。；;、\s]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!d) return (s.keywords || []).slice(0, 5).join('、') || '-';
  const m = d.match(/用于\s*([^。]+)/);
  let out;
  if (m) {
    const clue = m[1].trim();                      // 触发语，优先保
    const head = d.slice(0, m.index).replace(/[。，,；;\s]+$/, '').trim();
    out = (head && clue.length < 90 ? head + '。用于 ' : '用于 ') + clue;
  } else {
    out = d;
  }
  if (out.length > 118) out = out.slice(0, 84).replace(/[、，,/／]$/, '') + '…';
  return out.replace(/\|/g, '／') || '-';
}
const rows = skills.map(s => `| ${s.name} | ${whenToUse(s)} | ${s.needs.length ? s.needs.join(',') : 'any'} |`).join('\n');
const md = `# 派发表（自动生成，勿手改 · 由 scripts/build-catalog.mjs 生成）

用法：先 \`node scripts/route.mjs "<一句话>"\` 拿 Top3，命中就只读那些 SKILL.md 正文。

**route 沉默 ≠ 没有技能**：触发词只覆盖调过的那批说法（口语换说法的实测覆盖约 4 成）。
沉默时**通读第二列**判语义（整列读完约 3KB，比逐个读 40 个 description 便宜一个数量级）；选中后只读那一个 SKILL.md。
本表也没有对得上的，才走通用纪律。
用户点名技能以点名为准（点名的优先级高于任何打分）。

| 技能 | 什么时候用 | 宿主依赖 |
|---|---|---|
${rows}
`;
fs.mkdirSync(path.join(PKG, 'references'), { recursive: true });
fs.writeFileSync(path.join(PKG, 'references', 'dispatch-table.md'), md);
const missing = skills.filter(s => !s.keywords.length).map(s => s.name);
console.log(`CATALOG ${skills.length} skills -> catalog.json + references/dispatch-table.md`);
if (missing.length) console.log('WARN 无关键词: ' + missing.join(', '));
