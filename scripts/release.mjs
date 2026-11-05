#!/usr/bin/env node
// 发布前检查（本地）：版本号 / CHANGELOG / 全量技能审计 / 命中率 / 打包 / 待提交。
// 任一闸门失败 exit 1。不做任何 push（外部动作留给人工确认）。
// 用法：node scripts/release.mjs [--pack]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const argv = process.argv.slice(2);
const DO_PACK = argv.includes('--pack');

function sh(args) {
  try { return { code: 0, out: execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status || 1, out: ((e.stdout || '') + (e.stderr || '')).toString() }; }
}

const gates = [];
function gate(name, ok, detail) { gates.push({ name, ok, detail }); }

const skillMd = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
const ver = (skillMd.match(/^version:\s*([\d.]+)/m) || [])[1] || '';
gate('版本号', !!ver, ver || '未找到 version');

const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
gate('CHANGELOG', changelog.includes(`## ${ver}`), `## ${ver}`);

const audit = sh([path.join(here, 'audit-skills.mjs')]);
gate('技能审计', audit.code === 0, audit.out.trim().split('\n').slice(-1)[0] || '');

const evalr = sh([path.join(here, 'eval.mjs'), 'trigger']);
const f1 = (evalr.out.match(/F1=([\d.]+)/) || [])[1] || '';
gate('命中率', evalr.code === 0, f1 ? `F1=${f1}` : 'trigger 失败');

let zipInfo = '';
if (DO_PACK) {
  const p = sh([path.join(here, 'pack.mjs')]);
  const m = p.out.match(/FILES=(\d+) BYTES=(\d+) VERSION=([\d.]+)/);
  zipInfo = m ? `${m[1]} 文件 / ${m[2]} B / v${m[3]}` : p.out.trim().split('\n').slice(-1)[0];
  gate('打包', p.code === 0 && !!m, zipInfo);
}

for (const g of gates) console.log(`${g.ok ? 'OK  ' : 'FAIL'} ${g.name}: ${g.detail}`);
const bad = gates.filter(g => !g.ok);
console.log(`\nRELEASE ${bad.length ? 'BLOCKED' : 'READY'} · v${ver}${zipInfo ? ' · ' + zipInfo : ''}`);
if (bad.length) process.exit(1);
console.log('下一步（外部动作需人工确认）：推送分支 → 开/更新 PR → 合并 → 建 Release 并上传 zip。');
