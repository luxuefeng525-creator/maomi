# 发布链路（npm）· 现状留档

> 状态：**未上架**（`maomi-workbench` 在 registry 上仍为 404）。
> 最后一次实测：2026-10-26。本文只记录「实测过的现象 + 已验证的路径」，未验证处显式标注【待查证】。

## 1. 结论先看

| 项 | 状态 | 证据 |
| --- | --- | --- |
| 包体是否可发 | ✅ 可发 | `node scripts/validate.mjs` → `FAIL=0`；tarball `maomi-workbench-0.24.1.tgz` / 1.0MB / 1452 files |
| 包名是否可用 | ✅ 可用 | `npm view maomi-workbench` → `E404 Not Found`（无他人占用） |
| 本地 git 状态 | ✅ 干净 | `git status --short` 无输出；HEAD `de784cb` |
| 令牌能否认证 | ✅ 能 | `npm whoami` → `maomi-0859` |
| 令牌能否发布 | ❌ 不能 | `npm publish` → `E403 … granular access token with bypass 2fa enabled is required` |

**唯一卡点**：账号开了 2FA（auth-and-writes），手里的 granular token **没有启用「Bypass 2FA」** → registry 拒绝任何写操作。

## 2. 三条可用通道（任选其一）

### A. 带 Bypass 2FA 的 granular token（最直接）

1. npmjs.com → 头像 → **Access Tokens** → *Generate New Token* → **Granular Access Token**
2. 权限：**Read and write**（发布与暂存）
3. 软件包和作用域：**所有软件包**（只给 `@maomi-0859` 会让不带 scope 的 `maomi-workbench` 必然 403）
4. 安全设置：勾 **Bypass two-factor authentication**
5. 保存后立刻本地发布（令牌只走环境参数，不落盘、不进 git、不写进任何文件）：

```powershell
cd opensource/agent-workbench
npm publish --access public --registry https://registry.npmjs.org/ `
  --//registry.npmjs.org/:_authToken=<TOKEN>
```

> 注意：**编辑**已有令牌的权限一般不改令牌字符串；但「Bypass 2FA」这一项若没勾，发布依旧 403（已实测）。判断办法看报错文案：出现 `bypass 2fa` 字样 = 令牌没带；出现 `You may not perform that action` / 范围类措辞 = 范围不对。

### B. GitHub OIDC Trusted Publishing（不持有长期令牌）

CI 已改好（`.github/workflows/release.yml` 使用 `id-token: write`，不再用 `NODE_AUTH_TOKEN`）：

1. npmjs.com → 包设置 → **Trusted Publisher** → GitHub Actions
2. 填：用户 `luxuefeng525-creator`、仓库 `maomi`、workflow 文件名 `release.yml`、环境（可空）
3. 推 tag 触发：`git push origin v0.24.1` → CI 走 OIDC 直接 `npm publish --provenance`

> 【待查证】npm 是否允许为**尚不存在**的包配置 Trusted Publisher。若不支持，需先用通道 A/C 完成一次首发，再切 OIDC（长期建议终态）。

### C. 本机手动发布一次（人工输入 6 位 OTP）

```powershell
cd opensource/agent-workbench
npm publish --access public --registry https://registry.npmjs.org/
# 提示 Enter one-time password: 输入验证器里的 6 位码
```

## 2.5 一条命令看清卡在哪

```powershell
npm run release:preflight            # 全量：版本/CHANGELOG/tag/registry 占用/默认 registry/令牌身份
npm run release:preflight -- --offline        # 只查本地（不联网）
npm run release:preflight -- --token <TOKEN>  # 额外核对这条令牌是谁（令牌只进环境参数，不落盘）
```

输出 `PASS/WARN/FAIL` 三类，**有 FAIL 即退出码 1**。它把本文第 1、4 节里的坑都做成断言：

- `CHANGELOG 首条 ≠ package.json` → FAIL（对应 CI 门禁第 2 道）
- `本地没有 tag vX` → FAIL（release.yml 由 tag 触发）
- `registry 上已有同版本或更高版本` → FAIL（版本号不可回收，必须升版）
- `本机默认 registry 是镜像站` → WARN（发布必须显式 `--registry`）
- 无令牌 / 401 → WARN（走 OIDC 发布本就不需要令牌）
- 令牌身份取到了，但**是否勾了 Bypass 2FA 无法预判** → WARN（只能靠发布报错文案判断）

## 3. 发布前三道门（CI 与本地同一套）

`release.yml` 在 publish 之前强制三道校验，任一不过即中止（避免「版本号不可回收」的错版）：

1. **tag == package.json version**（`v0.24.1` ↔ `0.24.1`）
2. **CHANGELOG 首条 == package.json version**
3. **`npm run prepublishOnly`** = `index-skills --check && validate && tests/eval && tests/run`

本地等价自查（一条命令）：

```powershell
cd opensource/agent-workbench
node -p "require('./package.json').version"
node scripts/index-skills.mjs --check
node scripts/validate.mjs
node tests/eval.mjs
node tests/run.mjs
```

## 4. 已知不可用/易踩的坑（都是实测）

- **本机 npm 11.12.1 不支持 staged publishing**：`npm stage …` → `Unknown command: "stage"`，`npm publish --help` 也没有 `--stage`。所以「CI 暂存 + 网页审批绕过 2FA」这条路在本机当前版本走不通。
- **`~/.npmrc` 的默认 registry 是 npmmirror**（`https://registry.npmmirror.com`）。发布必须显式 `--registry https://registry.npmjs.org/`，否则 PUT 打到镜像站。
- **本机 `~/.npmrc` 里的旧 `_authToken` 已失效**（`npm whoami` → 401），不要拿它兜底。
- **npm 包名**：`agent-workbench`（cevelas 0.8.1）与 `maomi`（0.1.0）均被他人占用，本包名固定为 `maomi-workbench`；仓库目录仍叫 `agent-workbench`。

## 5. 发布后核对（不许只看 "published"）

```powershell
npm view maomi-workbench version          # 期望 0.24.1
npm view maomi-workbench dist.tarball
npm view maomi-workbench time --json | Select-String 0.24.1
```

`npm view` 有 CDN 缓存，若刚发布看到旧值/404，加 `?v=<时间戳>` 或用 `npm view --registry https://registry.npmjs.org/` 重试，别急着判定失败。

## 6. 撤销与回滚

- 24 小时内可 `npm unpublish maomi-workbench@0.24.1`（之后版本号**不可回收**，只能升版）。
- 发布后要回退，**优先发新补丁版**（0.24.2），而不是 unpublish（会破坏已安装者的 lockfile）。
