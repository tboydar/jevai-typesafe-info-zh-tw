# Jevai：TypeSafe AI 的 System One 決策模型 — 正體中文參考文件

> 本倉庫是 **Jev 1.13**（TypeSafe AI 的 System One 決策模型）的第三方正體中文研究整合與示範程式；不是 TypeSafe AI 的官方文件。
> 內容參照公開社群文件與產品官方文件，並以正體中文整理：

| 來源 | 倉庫 | 內容 |
|------|------|------|
| 📄 模型參考文件 | [`Satvik-codes/jevai-info-typesafe`](https://github.com/Satvik-codes/jevai-info-typesafe) | Jev 1.13 概覽、決策原語、LLM 對比、使用案例 |
| 🛠️ 開發者筆記 | [`codaaiteam/jev-typesafe-ai`](https://github.com/codaaiteam/jev-typesafe-ai) | 快速上手、curl 範例、常見使用案例、連結 |

> 🧪 **想直接動手試？** 本倉庫附一個 **bun + hono 的 fullstack demo 網站**（`demo/`），可編輯 state 與問題、即時查看決策結果；有 API 金鑰就真實呼叫，沒金鑰也有離線模擬模式。
> 也可在 **GitHub Pages 線上試用** → **https://tboydar.github.io/jevai-typesafe-info-zh-tw/**
> 見 [`demo/README.md`](demo/README.md)。

> **實作範圍：** 此 repo 沒有模型分類器、跨供應商路由服務或 agent executor。`demo/src/routing-policy.ts` 是離線參考 helper，尚未串接 Hono API；子代理配額只是未實作的設計建議，不會限制 Claude Code、Codex、Pi 或其他 executor。

---

## Jev 是什麼？

TypeSafe 將 System One 定位為供程式呼叫的決策模型：請求指定 state 與問題，API 依問題原語回傳型別化欄位。固定欄位形狀可減少格式解析工作，但**不保證語意判斷正確**；仍須用自己的標註資料驗證輸出並設計人工升級。

**一句話總結：** Jev 回傳型別化決策值，不是文字生成；Choice 與 Score 有信心值，Noul 回傳 yes 機率而沒有獨立信心欄位。任何機率、信心或分數都不是正確性保證，也不應未經資料驗證就直接採取高影響動作。

- **延遲**：依模型版本、輸入和服務環境而異；本 repo 未做效能測試
- **API 費率**：TypeSafe Models 頁於 2026-10-14 查核列出 Jev 每百萬 input tokens $0.042、output 免費；費率會變動，且無法只用每次請求固定估價
- **輸出**：依 API schema 回傳型別化欄位；語意正確性仍需評估
- **開發者**：TypeSafe AI；模型版本、API 行為與定價應以查核當日的官方文件為準

---

## 三種問題型別（Decision primitives）

你送給 Jev 的每個問題都是三種原語之一：

| type | 回傳 | 用途 |
|------|------|------|
| `choice` | 255 個選項中選一 + 各選項機率 | 路由、分類 |
| `score` | 依 2–10 個有序 levels 回傳 0 起始的機率加權位置，可為小數；`confidence` 是另一個欄位 | 風險、急迫性、品質、契合度 |
| `noul` | 是/否問題的 yes 機率 0–1，沒有獨立信心欄位 | 閘門（gate）、過濾、護欄（guardrail） |

`score` 是有序等級上的位置，不是機率、信心值或校準信心；`confidence` 另行回傳，仍不保證個案正確或適合直接採取高影響動作。請同時檢視選項/等級機率分布，並用自己的標註資料與 holdout 驗證門檻。

每個問題都提供 `type` 與 `instructions`，再加上自己的 `criteria` 形狀；所有問題**並行解析**，共享同一份 state。

```json
{ "type": "noul",   "noul": 0.29 }                        // 布林 · 機率 0–1
{ "type": "choice", "choice": "billing", "confidence": 1.0 } // 單選 · 最多 255 選項
{ "type": "score",  "score": 1.43, "confidence": 0.35 }     // 有序位置；範圍依 level 數決定
```

---

## 核心特性

- **不生成自由文字** — 回傳型別化欄位；API 錯誤或語意判斷仍需處理
- **固定回應欄位** — 有助於減少文字解析；仍要處理拒答、錯誤與語意錯判
- **輸出隨原語而異** — Choice/Score 提供機率分布與獨立的信心欄位；Score 數值本身不是信心值。Noul 提供 yes 機率，沒有獨立信心值
- **只有三種原語** — noul、choice、score
- **所有問題並行解析** — 對同一份共享 state
- **沒有取樣旋鈕** — temperature 與 top_p 不適用
- **效能需自行量測** — 本 repo 未做延遲或準確率 benchmark
- **費用依官方即時 rate card** — 查核日的 Jev 僅 input tokens 計價；請再查官方 Models 頁

---

## 快速上手

```bash
curl -X POST https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "jev-latest",
    "state": "Customer: I was charged twice and I am furious.",
    "questions": {
      "topic":  { "type": "choice", "instructions": "What is the issue about?",
                  "criteria": { "billing": "money problems", "bug": "broken product" } },
      "urgent": { "type": "noul", "instructions": "Escalate to a human now?" }
    }
  }'
```

回應示意（數值只用來說明欄位，不是此 repo 執行的結果或正確性承諾）：

```json
{
  "model": "jev-1.13.0",
  "answers": {
    "topic":  { "type": "choice", "choice": "billing", "confidence": 1.0,
                "probabilities": { "billing": 1.0, "bug": 0.0 } },
    "urgent": { "type": "noul", "noul": 0.82 }
  },
  "usage": { "input_tokens": 382, "output_tokens": 55 }
}
```

可以用程式讀取型別化欄位，但門檻與動作需先以本用途資料驗證；低信心、未知或缺少證據時應走人工覆核。

---

## 與一般 LLM 的比較

| 屬性 | 一般 LLM | Jev 1.13 |
|------|----------|----------|
| 主要功能 | 對話/文字生成或結構化輸出，依產品而異 | typed decision primitives |
| 輸出形式 | 可用 schema/function calling 約束，依 API 支援範圍而異 | Noul、Choice、Score 欄位 |
| 語意正確性 | 需以應用資料評估 | 需以應用資料評估 |
| 機率/信心 | 依模型與 API 介面而異，非通用保證 | Choice/Score 有 confidence；Noul 回傳 yes 機率 |
| 費用 | 依模型、快取與部署 rate card | 依官方 Models 頁查核當日費率 |
| 延遲 | 依模型、輸入與服務環境量測 | 依模型、輸入與服務環境量測 |
| 適合 | 起草、解說、寫程式、對話 | 路由、分流、評分、閘門、審核 |

---

## 常見使用案例

- **路由與分類** — 把 ticket、email、事件或文件送去正確的地方
- **評分與排序** — 把模糊的判斷變成你可以行動的門檻
- **護欄與閘門** — 自動放行簡單案例，升級不確定的案例
- **萃取** — 把自由文字轉成型別化、結構化的欄位

更深入的工作範例（情感分析、搜尋過濾、文章分類、新聞比對）見 [docs/04-use-cases.md](docs/04-use-cases.md)。

---

## 資源連結

- ▶️ **免費試玩（免排隊）：** https://jevtypesafeai.com
- 📖 什麼是 Jev：https://jevtypesafeai.com/what-is-jev
- 🔌 如何使用 API：https://jevtypesafeai.com/how-to-use
- 💵 定價：https://jevtypesafeai.com/pricing
- 🏢 官方網站：https://typesafe.ai
- 📚 官方文件：https://docs.typesafe.ai
- 📦 官方 SDK（JS/TS）：https://github.com/typesafe-ai/typesafe-sdk-js

---

## 目錄

- [demo/](demo/) — bun + hono fullstack 測試網站
- [demo/public/](demo/public/) — 純靜態前端（GitHub Pages 部署用，支援使用者自填 Token／端點）
- [docs/04-use-cases.md](docs/04-use-cases.md) — 深入使用案例
- [docs/sources.md](docs/sources.md) — 來源與整合說明、名詞對照
- [docs/routing-policy.md](docs/routing-policy.md) — 分類標籤、路由/額度邊界、子代理政策與查核證據

---

## 🌐 GitHub Pages（線上試用）

靜態前端（`demo/public/`）會透過 GitHub Actions 自動部署到 **https://tboydar.github.io/jevai-typesafe-info-zh-tw/**。

線上版（靜態模式）跟本機 server 版的差別：

| 功能 | 本機 `bun run dev` | GitHub Pages 靜態 |
|------|------------------|-------------------|
| API Token | 由後端讀 `TYPESAFE_API_KEY` | 使用者在網頁填入並存於 localStorage；送出時由瀏覽器以 Bearer header 傳給所選端點 |
| 端點選擇 | 固定官方端點 | 可選**官方端點**或**填自訂端點** |
| 無金鑰 | 離線模擬模式 | 需填 Token 才能呼叫 |
| CORS | 由後端 proxy 解決 | 靠 API 允許跨域（自訂端點若擋 CORS 則無法直接呼叫） |

---

## 授權

本文檔（翻譯與整合）以 **MIT** 授權釋出 — 可自由重複使用。
「Jev」、「System One」與「TypeSafe AI」分別歸屬於其擁有者。
