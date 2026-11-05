# 示例（examples）

这里放可直接改用的 E2E 模板。**不要把真实账号/密码提交进来**，用占位符。

## `e2e.login.example.json` — uni-app H5 账号密码登录

复制后替换三处占位符，再跑：

```bash
cp examples/e2e.login.example.json ./my-login.json
# 编辑 my-login.json，把 __BASE_URL__ / __PHONE__ / __PASSWORD__ 换成你的值

node scripts/browser.mjs \
  --module-dir "D:/your-project/app" \
  --steps ./my-login.json \
  --out ./evidence --timeout 20000 --overall 120000
```

`--module-dir` 指向**装了 playwright/playwright-core 的项目目录**；技能装在全局时必填。

## `e2e.order.example.json` — 登录 → 立即购买 → 确认页 → 提交（下单）

⚠️ **会真实创建订单**：链路是「先建单、再支付」。支付通道未配置时 `/payment/prepay` 返回 **503**，但**订单已经创建**——不要拿支付失败当「下单失败」。

```bash
cp examples/e2e.order.example.json ./my-order.json
# 替换 __BASE_URL__ / __PHONE__ / __PASSWORD__ / __TOKEN_KEY__ / __PRODUCT_ID__ / __STORE_ID__

node scripts/browser.mjs --module-dir "D:/your-project/app" \
  --steps ./my-order.json --out ./evidence --timeout 20000 --overall 180000
```

提交后**必须用订单接口核验**（页面可能因支付 503 停在订单中心，不代表没下单）：

```bash
TOKEN=$(curl -s -X POST "$API/auth/phone-login" -H 'Content-Type: application/json' \
  -d '{"phone":"__PHONE__","password":"__PASSWORD__","tenantId":1}' | node -e "...取 data.accessToken...")
curl -s -H "Authorization: Bearer $TOKEN" "$API/order/list?page=1&pageSize=5"
```

测完清理测试单，避免污染数据：

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"reason":"E2E 测试订单，自动清理"}' "$API/order/<orderId>/cancel"
```

## 踩过的坑（uni-app H5 通用）

- **路由是 history 模式**：登录页是 `/pages/login/index`，带 `#` 会落回首页。
- **placeholder 不是 input 属性**：uni-app 把占位文字渲染成独立元素，所以用
  `input[type=number]` / `input[type=password]` 定位，不要用 `input[placeholder="..."]`。
- **视图用 `v-if`**：同一页面多视图只渲染一个，选择器不会歧义。
- **登录态断言**：多数项目把 token 存 localStorage（如 `ws_token`），用
  `{"assertEval":["!!localStorage.getItem('ws_token')",true]}` 判定成败，别只看截图。
- **加购多为本地存储**（如 `ws_water_cart_v1`），断言 `indexOf('<productId>')>=0` 即可；
  **下单会写库**，属状态变更，先确认再点提交。
