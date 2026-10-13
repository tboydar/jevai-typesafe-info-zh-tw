# Jev 決策測試台 — demo（bun + hono）

一個可直接執行的 fullstack demo 網站，用來**快速測試 Jev（TypeSafe AI 的 System One 決策模型）**。

- **後端**：Bun + [Hono](https://hono.dev)，代理 `POST /api/systemone` 到 `https://api.typesafe.ai/v1/systemone`
- **前端**：單頁正體中文 UI（無框架、無 build step），可編輯 state 與任意數量問題，視覺化呈現型別化決策與機率分布

## 快速開始

```bash
cd demo
bun install

# 有 API 金鑰 → 真實呼叫（建議）
export TYPESAFE_API_KEY=your_key_here
bun run dev        # http://localhost:3000
```

### 沒有金鑰也能跑（離線模擬模式）

不設定 `TYPESAFE_API_KEY` 直接 `bun run dev` 即可。此時 `/api/systemone` 會回傳**模擬的決策回答**（見 `src/mock.ts`），頁面上方會顯示「離線模擬模式」橫幅，方便先測試 UI 流程。

## API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/health` | 回傳 `{ ok, mock, key_set }`，前端用它顯示模式 |
| POST | `/api/systemone` | 代理 TypeSafe API；無金鑰時回傳模擬回答 |

請求體就是 TypeSafe 的 `SystemOneRequest`：

```json
{
  "model": "jev-latest",
  "state": "Customer: I was charged twice and I am furious.",
  "questions": {
    "topic":  { "type": "choice", "instructions": "What is the issue about?",
                "criteria": { "billing": "money problems", "bug": "broken product" } },
    "urgent": { "type": "noul", "instructions": "Escalate to a human now?" }
  }
}
```

回應體：`{ model, answers: { <name>: { type, ... } }, usage }` — 因為型別固定，前端直接依 `answers.urgent.noul > 0.7` 這類條件分支即可，不需要解析。

## 結構

```
demo/
├── src/index.ts       Hono server（代理 + 靜態檔 + mock 切換）
├── src/types.ts       SystemOne 請求/回應型別
├── src/mock.ts        離線模擬回答
├── public/index.html  單頁 UI
├── public/style.css
└── public/app.js
```
