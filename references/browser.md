# 浏览器控制（按需加载 · 真操作，不只是截图）

`verify-visual.mjs` 只「看一眼」（截图 + 控制台 + 溢出）；`browser.mjs` 能**真操作**：导航、点击、填表、按键、等待、断言文本/可见性/URL、截图。用于 E2E 与真实交互验收。

## 何时用
- 表单提交、登录跳转、弹窗开关、列表筛选、分页、下钻等**多步交互**；
- 需要断言「点了按钮后出现某段文字 / 跳到某 URL / 某元素可见」；
- 截图自检之外，还要确认真实行为（对标 Claude Code 的 browser/computer-use 验证）。

只想知道「页面有没有报错/溢出」→ 用 `verify-visual.mjs` 就够，别上 E2E。

## 用法

```bash
# 步骤写在 JSON 文件里
node scripts/browser.mjs --url http://localhost:5173 --steps steps.json

# 或内联
node scripts/browser.mjs --steps '[{"goto":"http://localhost:5173"},{"click":"#export"},{"assertText":["#toast","导出成功"]}]'

# 只看某页并截图（等价轻量用法）
node scripts/browser.mjs --url http://localhost:5173 --screenshot shot.png
```

选项：`--timeout` 单步毫秒（默认 15000）、`--overall` 总毫秒（默认 180000）、`--headed` 有头（调试看）、`--width/--height`、`--out` 截图目录、`--allow-console` 忽略控制台报错、`--module-dir <项目目录>` 从项目 node_modules 解析 playwright（技能装全局、依赖装在项目里时必用）、`--channel msedge|chrome` 用系统浏览器（chromium 不可用时自动回退）。

## 步骤 DSL

| 步骤 | 含义 |
|---|---|
| `{"goto":"url"}` | 打开页面（waitUntil networkidle） |
| `{"click":"sel"}` | 点击元素 |
| `{"fill":["sel","text"]}` | 填入文本 |
| `{"press":"Enter"}` | 按键 |
| `{"waitFor":"sel"}` | 等元素出现 |
| `{"wait":800}` | 硬等（少用，优先 waitFor） |
| `{"assertText":["sel","子串"]}` | 断言元素文本包含子串 |
| `{"assertVisible":"sel"}` | 断言元素可见 |
| `{"assertUrl":"子串"}` | 断言当前 URL 含子串 |
| `{"assertEval":["表达式","期望"]}` | 断言页面内表达式结果等于期望（如登录后 `!!localStorage.ws_token`） |
| `{"screenshot":"path"}` | 截图 |
| `{"eval":"js 表达式"}` | 页面内求值（谨慎） |

输出 JSON：`ok`、`failedStep`、`steps[]`（每步 ok/error）、`consoleErrors`、`pageErrors`、`screenshot`。`ok=false` 时看 `failedStep` 定位，不会静默通过。

## 超时与降级
- 每步有超时，总时长也有上限；`browser.mjs` 会带 `TIMEOUT`/`OVERALL_TIMEOUT` 明确报错。
- 未装 `playwright/playwright-core/puppeteer` → 返回 `NO_BROWSER_DEP` 并 exit 3，**不阻塞主流程**：提示安装 `npm i -D playwright && npx playwright install chromium`，或改用宿主自带浏览器工具。
- 长流程（多页/多步）配合 `checkpoint.mjs`：每段前落检查点，超时后可续跑（见 `references/long-tasks.md`）。

## 安全红线
- 对**生产环境**只做只读验证；点击/提交类步骤只在测试环境或测试账号上跑。
- 不给真实凭据；用环境变量/测试账号。
- 不做支付、删除、批量修改等破坏性操作。
- 断言要写「期望结果」，没断言的成功点击不算验收。
