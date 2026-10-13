# Jevai：TypeSafe AI 的 System One 決策模型 — 正體中文參考文件

> 本倉庫是 **Jev 1.13**（TypeSafe AI 推出的第一款 **System One 決策模型**）的正體中文整合參考文件。
> 內容整合自底下兩份公開社群文件，並以正體中文翻譯、統整：

| 來源 | 倉庫 | 內容 |
|------|------|------|
| 📄 模型參考文件 | [`Satvik-codes/jevai-info-typesafe`](https://github.com/Satvik-codes/jevai-info-typesafe) | Jev 1.13 概覽、決策原語、LLM 對比、使用案例 |
| 🛠️ 開發者筆記 | [`codaaiteam/jev-typesafe-ai`](https://github.com/codaaiteam/jev-typesafe-ai) | 快速上手、curl 範例、常見使用案例、連結 |

> 🧪 **想直接動手試？** 本倉庫附一個 **bun + hono 的 fullstack demo 網站**（`demo/`），可編輯 state 與問題、即時查看決策結果；有 API 金鑰就真實呼叫，沒金鑰也有離線模擬模式。
> 也可在 **GitHub Pages 線上試用** → **https://tboydar.github.io/jevai-typesafe-info-zh-tw/**
> 見 [`demo/README.md`](demo/README.md)。

---

## Jev 是什麼？

一般的大型語言模型（LLM）設計來**跟人說話**。**Jev 設計來給機器呼叫**：你給它一些脈絡（你的程式狀態）以及你確實需要回答的問題，它回傳的是**結構化數值而不是散文**。因為答案的形狀由你的請求固定下來，Jev 無法幻覺出一個格式，也不可能吐出無效的型別。

**一句話總結：Jev 以語言模型的方式閱讀語言，但「不生成文字」— 它回傳帶校準機率與信心值的型別化答案，讓軟體可以直接採取行動。**

- **速度**：70–500 ms（可比任務上約比前沿 LLM 快 40–200 倍）
- **成本**：$0.042 / 百萬 input tokens，輸出免費（約每筆決策 $0.0004）
- **安全性**：不會幻覺出格式、不會有型別錯誤（結構上保證）
- **開發者**：TypeSafe AI（由前 OpenAI 研究員 Diogo Almeida 創辦），2026 年 9 月推出

---

## 三種問題型別（Decision primitives）

你送給 Jev 的每個問題都是三種原語之一：

| type | 回傳 | 用途 |
|------|------|------|
| `choice` | 255 個選項中選一 + 各選項機率 | 路由、分類 |
| `score` | 2–10 級有序量表上的分數 | 風險、急迫性、品質、契合度 |
| `noul` | 校準的 yes/no，以 0–1 機率表示 | 閘門（gate）、過濾、護欄（guardrail） |

每個問題都提供 `type` 與 `instructions`，再加上自己的 `criteria` 形狀；所有問題**並行解析**，共享同一份 state。

```json
{ "type": "noul",   "noul": 0.29 }                        // 布林 · 機率 0–1
{ "type": "choice", "choice": "billing", "confidence": 1.0 } // 單選 · 最多 255 選項
{ "type": "score",  "score": 3.0, "confidence": 1.0 }       // 序數 · 2–10 有序等級
```

---

## 核心特性

- **不生成文字** — 沒有訊息、說明、摘要或���式碼
- **不可能回傳無效形狀** — 輸出型別事先固定
- **每次答案都有校準機率** + 信心值
- **只有三種原語** — noul、choice、score
- **所有問題並行解析** — 對同一份共享 state
- **沒有取樣旋鈕** — temperature 與 top_p 不適用
- **毫秒級而非秒級** — 延遲與輸出長度無關
- **輸出免費** — 成本只隨 input tokens 而變

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

回應：

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

因為型別固定，你可以用純程式直接依結果分支 — `if (answers.urgent.noul > 0.7)` — 不需要解析、不需要 regex、沒有格式錯誤的風險。

---

## 與一般 LLM 的比較

| 屬性 | 一般 LLM | Jev 1.13 |
|------|----------|----------|
| 主要功能 | 文字生成 | 決策解析 |
| 輸出形式 | 不受限制的散文或程式碼 | 每次呼叫固定 JSON schema |
| 輸出成本 | 按生成的 token 計費 | 免費 |
| 格式錯誤 | 可能發生；需要防禦式解析 | 結構上不可能 |
| 信心值 | 不提供 | 校準值 + 機率分布 |
| 延遲 | 秒級；隨輸出成長 | 毫秒級；平坦 |
| 每多一個問題 | 延遲上升 | 免費；並行執行 |
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

---

## 🌐 GitHub Pages（線上試用）

靜態前端（`demo/public/`）會透過 GitHub Actions 自動部署到 **https://tboydar.github.io/jevai-typesafe-info-zh-tw/**。

線上版（靜態模式）跟本機 server 版的差別：

| 功能 | 本機 `bun run dev` | GitHub Pages 靜態 |
|------|------------------|-------------------|
| API Token | 由後端讀 `TYPESAFE_API_KEY` | 使用者在網頁「連線設定」填入（存 localStorage） |
| 端點選擇 | 固定官方端點 | 可選**官方端點**或**填自訂端點** |
| 無金鑰 | 離線模擬模式 | 需填 Token 才能呼叫 |
| CORS | 由後端 proxy 解決 | 靠 API 允許跨域（自訂端點若擋 CORS 則無法直接呼叫） |

---

## 授權

本文檔（翻譯與整合）以 **MIT** 授權釋出 — 可自由重複使用。
「Jev」、「System One」與「TypeSafe AI」分別歸屬於其擁有者。
