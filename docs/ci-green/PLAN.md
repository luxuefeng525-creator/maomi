# PLAN — 自检闭环修复：CI 转绿 + 消除 cwd 依赖

> 档位 L1（4 文件）· 2026-10-27 · 触发：实测发现 GitHub Actions 连续 19 次红，且本地 eval 1/29 FAIL

## 一、目标

让「自检体系」本身可被信任：CI 绿灯必须是真绿，且不随调用者 cwd / 操作系统漂移。

四条修复：

| # | 现象（实测证据） | 根因 | 修法 |
| --- | --- | --- | --- |
| 1 | CI run 10→28 连续 19 次 `failure`，失败步 `Unit checks`；日志 `FAIL \| check-hook 真跑宿主 shell \| 非 win32 跳过语法断言` | `tests/run.mjs` 非 win32 分支用反例（故意无 `&` 的 PowerShell 写法）去要求 `status===0`，而该反例在 sh 下本就不是「正例」 | 非 win32 改用**正例**断言：用 `install-hook` 生成的真实配置跑 `check-hook`，须 exit 0 且出现「宿主 shell 可执行」。既有语义，非空跑 |
| 2 | `node tests/eval.mjs` 28 pass / 1 fail：`validate_ok \| validate.mjs exit=1 期望 0`；复现于任意非仓库 cwd | `skills/project-orchestrator/scripts/validate.mjs` 用 `process.cwd()` 解析技能引用文件（`rules/agent-rules.md`、`tests/behavior/providers.json`） | 引用路径候选追加「由 SKILL.md 所在仓库根推导」的路径，cwd 只作兼容候选 |
| 3 | CI matrix 仅 `ubuntu-latest`，而 hook 是 PowerShell 语义（`&` 调用运算符） | 平台相关缺陷在 Linux 上测不出，正是 0.20.13 那个坑能溜进来的原因 | matrix 增 `windows-latest`（node 20）；Windows 上 `pwsh` 可用则真跑语法断言 |
| 4 | CI 中 `Unit checks` 失败后 `Scenario eval` 被 skip，一条红遮住后面全部场景 | 步骤顺序：单测在前、场景评测在后 | 场景评测提到单测之前（失败互不遮蔽），或加 `if: always()`；采用前者并保留失败可见 |

## 二、边界（不做的事）

- 不改 `check-hook.mjs` 的行为（它是对的），只改**测试如何断言它**。
- 不为了绿而放宽判定：非 win32 分支必须换成有语义的正例断言，禁止 `true` 空判。
- 不动 `skills/*/SKILL.md` 内容与 registry 生成规则。
- 不引入新依赖、不新增 CI 服务。

## 三、验收标准（可核验）

1. `node scripts/validate.mjs` 在**仓库根**与**任意临时 cwd** 下均 `FAIL=0`（两次实跑留证）。
2. `node tests/run.mjs` → `PASS=81 FAIL=0`（本机 Windows，含改写后的 10b 用例）。
3. `node tests/eval.mjs` → `fail=0`（29/29）。
4. push 后 GitHub Actions 两个 job（ubuntu / windows）**均 success**，run 号与链接留证。
5. 非 win32 分支的新断言在**故意破坏**时能 FAIL（构造：把生成配置的 node 路径改成不存在 → 该用例必须红），证明不是空跑。

## 四、数据模型 / 接口变化

无。仅测试与路径解析改动，不改任何对外 CLI 参数、退出码语义、账本结构。

## 五、影响面

- 受影响文件：`tests/run.mjs`、`skills/project-orchestrator/scripts/validate.mjs`、`.github/workflows/test.yml`（+ 本 PLAN/账本）。
- 使用者影响：无 API 变化；开源用户获得的绿灯由「仅 Windows 有效」变为「两平台有效」。
- 成本：CI 增一个 Windows job（约 +1~2 分钟/次）；本机测试耗时不变（37s）。
- 回滚：单 commit revert 即可（`git revert <sha>`）。

## 六、风险

- CI 上 `pwsh` 在新版 `windows-latest` 存在，若缺失 `check-hook` 会退化到 `powershell`，断言仍成立（已兼容）。
- Windows job 首次跑可能出现路径分隔符问题，需按实测调整一次。
