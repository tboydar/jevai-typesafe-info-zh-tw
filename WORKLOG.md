# 工作記錄（Worklog）

## 專案

**jevai-typesafe-info-zh-tw** — Jev（TypeSafe AI / System One）正體中文整合文件 + bun/hono demo 測試網站

- GitHub: https://github.com/tboydar/jevai-typesafe-info-zh-tw
- GitHub Pages（線上試用）: https://tboydar.github.io/jevai-typesafe-info-zh-tw/

---

## 2026-10-13（今天）

### 任務
建立正體中文版的 Jev / TypeSafe 參考文件 repo，並附上可實際測試的 fullstack demo。

### 執行步驟

1. **研究「jev-typesafe-info」**
   - 確認 `github.com/tboydar/jev-typesafe-info` **不存在**（掃過 tboydar 全部 370 個 repo、URL 直接 404、`git ls-remote` 亦確認）。
   - 以 GitHub 搜尋找到名稱最吻合、內容相應的兩份社群文件：
     - `Satvik-codes/jevai-info-typesafe` — Jev 1.13 參考文件（單頁靜態）
     - `codaaiteam/jev-typesafe-ai` — 開發者筆記/範例（MIT）
   - 初步研究摘要先記錄在 `tboydar/jev-typesafe-info/RESEARCH.md`（研究用資料夾，未列入本 repo）。

2. **建立正體中文整合 repo**（`jevai-typesafe-info-zh-tw`）
   - 整合兩份來源，翻譯並統整成 `README.md`（含來源對照表、快速上手、LLM 對比、常見案例）。
   - `docs/04-use-cases.md` — 深入使用案例（4 個工作範例）。
   - `docs/sources.md` — 來源與整合說明、名詞對照。
   - MIT 授權（含來源歸屬）。

3. **bun + hono fullstack demo**（`demo/`）
   - Hono server：`POST /api/systemone` 代理到 `https://api.typesafe.ai/v1/systemone`。
   - 無 `TYPESAFE_API_KEY` 時自動切換**離線模擬模式**（`src/mock.ts`），方便無金鑰測試 UI。
   - 正體中文單頁前端：可編輯 state 與任意數量問題（noul/choice/score），視覺化呈現型別化決策與機率分布。
   - 已實測：`/api/health`、靜態檔、`/api/systemone`（模擬）皆正常。

4. **GitHub Pages 部署 + 使用者自填 Token／端點**
   - 前端改為**雙模式**：本機 server proxy 模式 vs GitHub Pages 靜態模式（自動偵測 `/api/health` 是否存在）。
   - 新增「⚙ 連線設定」面板：使用者填 API Token（存 localStorage，不外送）、可選**預設官方端點**或**自訂端點**。
   - GitHub Actions（`.github/workflows/pages.yml`）自動部署 `demo/public/` → GitHub Pages。
   - 線上版已成功部署並驗證首頁 / app.js / style.css 均 200 OK。

### 驗證

| 項目 | 結果 |
|------|------|
| `bunx tsc --noEmit`（demo 類型檢查） | ✅ 通過 |
| `bun run dev` 本機啟動 | ✅ http://localhost:3000 |
| `GET /api/health` | ✅ `{"ok":true,"mock":true,"key_set":false}` |
| 靜態檔（index/app.js/style.css） | ✅ 200 |
| `POST /api/systemone`（模擬） | ✅ 回傳型別化答案 |
| GitHub Actions 部署 | ✅ 成功（deploy 32s） |
| GitHub Pages 線上首頁 | ✅ 200（後綴 zh-tw） |

### 已知事項 / 注意事項

- `jitney typesafe github pages 模式` 需使用者自行填 Token 才能呼叫真實 API；瀏覽器直接打 API 依賴官方端點允許 CORS，自訂端點若擋 CORS 則無法從靜態頁呼叫（可改用本機 server proxy 模式）。
- 靜態模式使用的 Pages URL 帶 `zh-tw` 後綴，以對映「繁體中文」定位。
- 第三方社群文件內容非官方背書，實際行為以官方（typesafe.ai）為準。

### 後續可做

- 部署 demo 到 VPS/Cloudflare Workers（保留 server proxy 模式線上版）。
- 增加更多內建範例（情感分析、搜尋過濾、文章分類等）。
- 若官方 API 支援，加入其他官方 gateway 端點預設選項。
