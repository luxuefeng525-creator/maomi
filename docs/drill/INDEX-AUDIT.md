# 真实仓库索引精度抽查 · 2026-10-26

对象：`f:\开发软件\桶装水开发`，范围限定 `app/src`、`admin/src`、`server/src`。

## 规模与耗时

```text
INDEX files=1069 routes=264 mapLines=240
耗时 20.3 秒
```

- 文件 1069（Vue / TS / JS）
- 符号 7080
- 路由 264（pages.json 页面 + Nest `@Controller`）

## 精度指标

| 项 | 数值 |
| --- | --- |
| 内部 import（相对路径 / `@/`） | 2463 |
| 成功解析 | 2463（100%） |
| 未解析 | 0 |
| 外部包 import | 1633（不计入） |
| pages.json 路由映射 | 264 |
| 路由文件缺失 | 0 |

修复前后对比：`server/src` 的 `@/common/*`、`@/modules/*` 曾全部未解析（732 条）。原因是只认 `app`/`admin` 的 `@/` 基线；补上 `server/src` 基线后归零。

## 抽查样本

| 查询 | 结果 | 判定 |
| --- | --- | --- |
| `route pages/water/channel` | `app/src/pages/water/channel.vue` | 正确 |
| `route pages/index/index-v2` | `app/src/pages/index/index-v2.vue` | 正确 |
| `route pages/message/center` | `app/src/pages/message/center.vue` | 正确 |
| `query StockService` | `server/src/modules/catalog/stock.service.ts:27` | 正确（该模块真实位置） |
| `related server/src/common/guards/jwt-auth.guard.ts` | 调用方 `server/src/app.module.ts` | 正确 |

## 已知限制（本轮实测发现）

1. **只解析静态 import**：动态 `import()`、`require` 拼接路径不解析。
2. **Vue `<script setup>` 符号覆盖有限**：只按函数/常量声明抓，模板内组件名不建符号。
3. **tsconfig paths 覆盖有限**：只读根与 `app`/`admin`/`server`/`web` 五处；Monorepo 子包需扩展。
4. **路由只认 pages.json 与 Nest Controller**：Vue Router、Next、动态路由参数未覆盖。
5. **全仓直接 build 会超时**：默认扫描会进 `uploads/static` 等非代码目录；本次用 `--dirs` 限定范围。建议默认排除资源目录。

## 复跑

```powershell
node scripts/repo-index.mjs build --root "<仓库>" --dirs "app/src,admin/src,server/src" --out "<临时目录>"
node scripts/repo-index.mjs audit --root "<仓库>" --out "<临时目录>"
node scripts/repo-index.mjs route --root "<仓库>" --out "<临时目录>" --path pages/water/channel
node scripts/repo-index.mjs related --root "<仓库>" --out "<临时目录>" --file server/src/common/guards/jwt-auth.guard.ts
```

临时索引目录已删除，未在业务仓库存放产物。
