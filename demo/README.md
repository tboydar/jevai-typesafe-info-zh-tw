# Jev 決策測試台 — demo（Bun + Hono）

這是研究/教學用途的第三方示範網站，用來檢視 Jev（TypeSafe AI 的 System One 決策模型）請求與回應形狀；不是模型評測或生產路由服務。

- **後端**：Bun + [Hono](https://hono.dev)，代理 `POST /api/systemone` 到 `https://api.typesafe.ai/v1/systemone`
- **前端**：單頁正體中文 UI（無框架、無 build step），可編輯 state 與問題，視覺化呈現型別化決策與機率分布
- `src/routing-policy.ts` 是離線參考函式，示範依明確能力、API 存取、協定和容量選候選、估算已知 API rate card 下費用並限制 retry；它不呼叫服務、不讀取訂閱，也未串接到 Hono proxy。
- 此 repo 沒有 agent executor、subagent spawn API 或執行層硬限制；子代理配額僅是未實作的設計建議。

## 快速開始

```bash
cd demo
bun install

# 有 API 金鑰 → 真實呼叫（建議）
export TYPESAFE_API_KEY=your_key_here
bun run dev        # http://localhost:3000
```

### GitHub Pages 靜態版（不需後端）

線上試用：**https://tboydar.github.io/jevai-typesafe-info-zh-tw/**

部署的 `demo/public/` 是**純靜態前端**，會自動偵測沒有後端後切換到「靜態模式」：

- 在網頁上「連線設定」填入你自己的 **API Token**（存 localStorage，不送出伺服器）
- **端點可選**：預設官方 `https://api.typesafe.ai/v1/systemone`，或選「自訂端點…」填其他 URL
- 直接由瀏覽器呼叫該端點（需該端點允許 CORS）

> 部署方式：[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) 只在 push 到 `main` 或手動觸發時發布；pull request 沒有 Pages 預覽。

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

回應體：`{ model, answers: { <name>: { type, ... } }, usage }`。型別欄位可用程式讀取；但機率/信心不保證語意正確，門檻需以本用途資料驗證，低信心、未知或缺少證據時應人工覆核。

## 結構

```
demo/
├── src/index.ts       Hono server（代理 + 靜態檔 + mock 切換）
├── src/types.ts       SystemOne 請求/回應型別
├── src/mock.ts        離線模擬回答
├── src/routing-policy.ts 離線政策 helper（非 executor）
├── src/routing-policy.test.ts 合成政策測試
├── public/index.html  單頁 UI
├── public/style.css
└── public/app.js
```

## 測試

~~~sh
bun test
~~~

離線測試只使用合成資料。它們檢查政策 helper 的分支，不驗證 Jev、Laya、OpenAI、Microsoft 的真實表現、API 額度或 executor 限制。
