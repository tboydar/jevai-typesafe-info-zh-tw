# 來源與整合說明

本倉庫為 **正體中文整合版**，內容改編／翻譯自以下公開社群文件，並加入可執行的 demo 應用：

| 來源 | 倉庫 | 授權 | 使用的內容 |
|------|------|------|-----------|
| 📄 模型參考文件 | [`Satvik-codes/jevai-info-typesafe`](https://github.com/Satvik-codes/jevai-info-typesafe) | 未標示 | 概覽、決策原語、LLM 對比、使用案例 |
| 🛠️ 開發者筆記 | [`codaaiteam/jev-typesafe-ai`](https://github.com/codaaiteam/jev-typesafe-ai) | MIT | 快速上手、curl 範例、常見案例、連結 |

## 名詞對照

| 英文 | 正體中文 |
|------|----------|
| System One decision model | System One 決策模型 |
| classification | 分類 |
| typed answers | 型別化答案 |
| calibrated probabilities | 校準機率 |
| confidence | 信心值 |
| decision primitive | 決策原語 |
| routing / triage | 路由 / 分流 |
| guardrail / gate | 護欄 / 閘門 |
| state | 狀態（模型讀取的程式脈絡） |

## 官方資源（非本倉庫所有）

- 官網：https://typesafe.ai
- 文件：https://docs.typesafe.ai
- 免費試玩：https://jevtypesafeai.com
- 官方 SDK（JS/TS）：https://github.com/typesafe-ai/typesafe-sdk-js

## 注意事項

- 「Jev」、「System One」與「TypeSafe AI」商標歸屬於其擁有者 TypeSafe AI。
- 第三方社群文件非官方背書；實際行為以官方文件與 API 為準。
- 本 demo 在未設定 `TYPESAFE_API_KEY` 時回傳模擬回答，僅供測試 UI，不代表真實模型輸出。
