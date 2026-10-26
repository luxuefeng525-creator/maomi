# 排错速查：现象 → 含义 → 处置

只收录本包或本机真实踩过的坑。每条都有证据路径，不写理论。

## 1 Hook 写了不生效

| 项 | 内容 |
| --- | --- |
| 现象 | `.trae/hooks.json` 存在，会话开始没有 `[SESSION]` 注入；`.agent-runs/session-start.log` 里 `event=manual` |
| 含义 | 只写文件不会被宿主加载，必须在「设置 → Hooks → 项目」创建/启用并重启 |
| 处置 | 设置里启用；重开会话后看回执是否出现 `"source":"startup"` |
| 证据 | `docs/hooks.md` 注意节 |

## 2 H5 构建 `ENOTEMPTY ... dist/build/h5/assets`

| 项 | 内容 |
| --- | --- |
| 现象 | `uni build` 失败，assets 目录删不掉 |
| 含义 | `pm2 stop` 后 watchdog 会重拉 preview，旧 vite 进程仍持有目录 handle |
| 处置 | `UNI_OUTPUT_DIR=dist/build/h5-next` 构建 → 停 preview + kill 5182 vite → 删旧 `h5` → `Move-Item h5-next h5` → `pm2 start` → `health-all` |
| 证据 | `docs/首测-频道页闭环/CLOSURE.md` 构建踩坑 |

## 3 重载后 `ECONNREFUSED`，但 PM2 显示 online

| 项 | 内容 |
| --- | --- |
| 现象 | `pm2 reload water-api` 后立刻探活失败，5–10 秒后仍拒连 |
| 含义 | Nest 冷启动约 50s；`online` 只代表进程在，不代表端口在听 |
| 处置 | 等 30–60 秒再探；用 `node scripts/health-all.mjs` 统一判定 |
| 证据 | `docs/水质报告适用范围-20261026/EVIDENCE.md` 踩坑节 |

## 4 静默命令没留下证据文件

| 项 | 内容 |
| --- | --- |
| 现象 | `npx eslint --quiet \| Tee-Object -FilePath x.txt` 之后文件不存在，Stop 闸门报证据缺失 |
| 含义 | 零输出时 PowerShell 管道没创建/写入目标文件 |
| 处置 | `Out-File` 显式落盘，并追加 `EXIT=$LASTEXITCODE`；别依赖空管道 |
| 证据 | `logs/wq-scope-app-eslint.txt` |

## 5 `health-all.txt` 写入 `EBUSY`

| 项 | 内容 |
| --- | --- |
| 现象 | 探活本身通过，末行报 `EBUSY: resource busy or locked` |
| 含义 | 脚本自己会写 `logs/health-all.txt`，外层又用 `Tee-Object` 指向同一文件 |
| 处置 | 直接跑 `node scripts/health-all.mjs`，不要再 Tee 同路径 |
| 证据 | `logs/health-all.txt` |

## 6 行为断言把「没做」判成「做了」

| 项 | 内容 |
| --- | --- |
| 现象 | 回复写「未重做 T1」，`responseMustNot: ["重做 T1"]` 反而命中，判 partial |
| 含义 | 文本断言不认否定语境；关键词出现在否定句里也算命中 |
| 处置 | `mustNot` 只放正向违规词（`已重做`、`从头开始`）；`must` 补同义词（`没动 / 未改动 / 原样保留`） |
| 证据 | `docs/behavior-eval/REPORT.md` 断言误伤节 |

## 7 子代理起不来 / 不能再派生

| 项 | 内容 |
| --- | --- |
| 现象 | 并行第 6 个起报 `concurrent subagent limit reached (limit: 5)`；子代理内再开子代理直接失败 |
| 含义 | 宿主并发上限 5，且子代理没有派生能力 |
| 处置 | 分批 ≤5 跑；需要「双代理」场景时按车道等价执行并如实记录，不伪造痕迹 |
| 证据 | `docs/behavior-eval/REPORT.md` B5 节 |

## 8 快照路径被截断（`a.txt` → `.txt`）

| 项 | 内容 |
| --- | --- |
| 现象 | 快照清单里路径少一个字符，回滚后文件内容不对 |
| 含义 | `git status --porcelain -z` 首行带前导空格，解析时 `trim()` 把 XY 挤掉一位 |
| 处置 | status 解析保留原始 stdout，不 trim |
| 证据 | `tests/run.mjs` snapshot 用例 |

## 9 单测突然变红，但改的代码跟它无关

| 项 | 内容 |
| --- | --- |
| 现象 | `doctor 父级只有合成回执时不假绿` 变红：期望 degraded，实际 ok，detail 指向**仓库根**的真实心跳 |
| 含义 | 夹具建在仓库内（`tests/.tmp/upparent`），而被测函数会**向上 5 级**扫 `.agent-runs` → 本机当天跑过 hook 就有新鲜证据，把「合成回执是唯一证据」的前提推翻。典型的环境耦合型假红 |
| 处置 | ①凡「向上/向外遍历」的代码，夹具放系统临时目录（`os.tmpdir()+mkdtemp`），不放进被测扫描范围；②断言退出码前先问「这个码是否依赖环境」（如 `release-preflight --offline` 会核 tag，未打 tag 的提交必然非 0，只能断言具体 PASS 行）；③别改断言去凑绿——假红会训练人忽略红灯 |
| 证据 | `tests/run.mjs` 10c 节夹具位置注释；0.25.0 commit e4b6062 |

## 10 npm 发布 403，但不知道卡在哪一项

| 项 | 内容 |
| --- | --- |
| 现象 | `npm publish` → `E403 … granular access token with bypass 2fa enabled is required` 或 `You may not perform that action with these credentials` |
| 含义 | 403 有两种完全不同的原因：**令牌范围**不够（只给了 scoped 包）与**令牌没勾 Bypass 2FA**。文案含 `bypass 2fa` = 后者；含 scope/权限类措辞 = 前者。另有一种隐蔽错因：本机默认 registry 是镜像站，PUT 根本没打到 npmjs.org |
| 处置 | 先跑 `npm run release:preflight -- --token <TOKEN>` 把版本/CHANGELOG/tag/包名占用/默认 registry/令牌身份一次列清；再按 `docs/release-publish.md` 选通道（Bypass 2FA 令牌 / GitHub OIDC / 手工 OTP） |
| 证据 | `docs/release-publish.md`；0.24.x 两次 403 实测记录 |
