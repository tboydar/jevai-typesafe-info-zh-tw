# 分類、模型路由與執行配額政策

> 查核日期：2026-10-14。這份文件是本 repo 的研究/示範政策，不是 TypeSafe、Laya、OpenAI 或 Microsoft 的產品說明，也不是實際 agent executor 的硬控制。

## 1. 這個 repo 能做什麼

本 repo 是 TypeSafe System One 的正體中文研究網站與 Bun/Hono API 示範。現有服務只代理至 TypeSafe 的 /v1/systemone 或回傳合成 mock；沒有模型分類器、跨供應商選擇器、訂閱/帳戶連接器、agent executor、subagent spawn API 或執行佇列。

新增的 demo/src/routing-policy.ts 是**離線參考 helper**：輸入呼叫端提供的分類建議、信心值及該用途門檻，還有明確的能力/協定/API 存取/容量欄位，回傳候選或人工升級；可按工作類型給候選設定私有優先序。另有 API rate card 單次估價與每任務 retry 預算函式。它不連外、不讀 dashboard、不執行任務、不啟動 subagent，也未整合到 Hono proxy。測試只證明示範函式行為，不證明真實供應商額度或 executor 限制。

## 2. 品牌與功能辨識

| 名稱 | 官方來源可支持的描述 | 邊界與未知 |
|---|---|---|
| TypeSafe AI / System One / Jev | TypeSafe 官方文件把 System One 描述為非散文式決策模型能力；Jev 是 TypeSafe 的模型。API 文件列出 POST /v1/systemone。「Decision API」若指該 endpoint，是便於理解的稱呼，非已核實的另一品牌/產品名稱。 | 固定欄位形狀不保證語意正確。校準/信心是供應商文件對產品的描述；信心高不代表個案必然正確。 |
| System One：Noul | 是/否問題，回傳 0–1 的 yes 機率。官方文件沒有獨立 confidence 欄位；0.5 附近代表模型較難判斷，不是通用門檻。 | noul 不是通用 certainty 或安全評分。風險門檻要用所屬領域資料驗證。 |
| System One：Choice | 在固定選項中選一個，回傳所選標籤、選項機率分布及 confidence；官方文件列出最多 255 個選項。 | 信心不是類別準確率；要有 other/unknown 或人工路徑處理未覆蓋與模糊輸入。 |
| System One：Score | 以 2–10 個有序文字 levels 評分；score 是 level 機率加權的 0 起始位置，可為小數，另有每 level 機率與 confidence。 | 不是固定 2–10 分制；勿以四捨五入 score 當最可能 level。分布、信心與 holdout 都要查看。 |
| Laya | 本次先將「Laya」解讀為 Hugging Face 的 convaiinnovations/laya model card。該卡描述自架 typed decision model 家族，其 Router 按語言/文字特徵選該家族的 English、multilingual 或 typed-decisions checkpoint；並自述 laya-serve 接受 Jev 相容 HTTP request/response shape。 | 這是模型家族內的 checkpoint routing，不是跨 OpenAI/Microsoft/TypeSafe 服務路由或訂閱額度管理器。效能數據是發布者主張，需獨立 holdout 驗證。不能由 publisher 字串推定與同名 Convai 公司/產品有關。若「Laya」所指不同，標 unknown。 |
| OpenAI / GPT | OpenAI API 的 Structured Outputs 可在支援範圍按 JSON Schema 約束輸出形狀；function calling 是模型與應用程式工具的介面。 | 不是 Jev 三原語 API，也非獨立分類產品；schema 合規不等於分類正確，拒答、token 上限造成的不完整回應仍需處理。API 費率依模型與 input/cached input/cache write/output 等項目。 |
| Microsoft Foundry | Foundry 可部署模型並提供 REST 使用方式；官方 cost 文件區分 serverless token 計量及受管理運算資源費用。 | 不可用 Microsoft 365 Copilot 或 GitHub Copilot 訂閱狀態推定 Foundry endpoint、額度、協定或費率；要看特定 deployment 設定。 |
| Microsoft 365 Copilot | Copilot APIs 是 Microsoft 365 Copilot 產品能力 API；官方文件列有適用授權/訂閱要求。 | 與 Foundry、GitHub Copilot、OpenAI GPT API 是不同產品。若「Microsoft 方案」指其他服務或自訂 endpoint，身分和協定標 unknown。 |
| GitHub Copilot | 本次沒有找到可支持把該訂閱視為這裡通用決策 API 的官方證據。 | unknown：不得宣稱可供此 demo 呼叫或能使用 OpenAI/TypeSafe protocol。 |

查核來源與日期見 [sources.md](sources.md)。產品頁、API、版本與價格會變更，部署前應重新查閱官方說明。

## 3. 分類標籤：建議值，不是執行命令

以下標籤描述一筆**合成/匿名工作案例的建議處理方式**，不能當成模型必須啟動 agent 的命令。repo 沒有分類器可產生這些標籤；demo helper 只接受呼叫端交入的 label。

| 標籤 | 定義 | 正例 | 反例 / 升級 |
|---|---|---|---|
| routine | 範圍明確、低風險、輸入輸出單純，通常由單一 agent 一次完成。 | 將一筆合成客服訊息分成固定三個標籤。 | 多個互相依賴資料源或高影響變更不屬 routine。 |
| reasoning | 需要跨來源比對、權衡或多步推理；複雜度本身不代表該分拆。 | 對照三份公開 API 文件，列出協定差異與未知項。 | 單一可直接查清的事實不需要此標籤；仍須考慮任務獨立性及協調成本。 |
| manual_review | 需人工授權/裁定、錯誤代價高、證據衝突，或工作流程不能安全自動執行。 | 需要人工核准的合成權限變更。 | 模型信心高也不能取消必要的人工核准。 |
| unknown | 關鍵名稱、能力、協定、容量或請求語意沒有可核實資料。 | 只說「用 Laya」，但不能辨認供應商或 endpoint。 | 不得默認為 routine、available 或某個服務；先補證據或送人工。 |

低信心、缺失信心、門檻未經 holdout 驗證、選項未涵蓋、請求格式錯誤或服務拒答，都應採保守路徑：不自動派送，記錄可公開原因並要求人工確認。helper 要求呼叫端提供信心值與該用途明確門檻；門檻不是全域常數。不要把 prompt 中的「不要用 subagent」當成 spawn 硬控制。

合成 examples 放在 demo/src/routing-policy.fixtures.ts，分成 development 與 holdout。holdout 不參與定義/調整任何門檻；目前沒有實際分類器或準確率主張，這些例子只測試資料隔離與政策分支。

## 4. 公開 usage dashboard 的容量線索

使用者指定的公開頁 https://dar-llm-usage.pages.dev/ 於 2026-10-14 查核。頁面顯示版本 v20261012.1、last refresh 12:54:31 PM，各卡片相對更新約 7–10 分鐘前；畫面沒有時區。當時各服務可用狀態不一致，所以這只支持「狀態有變動、需要讀取新鮮明確狀態」的背景判斷。本文件不複製個別服務名稱、百分比、點數、付款、額度或其他帳戶資料；dashboard 不是公開 API 能力或 protocol 來源。

真實跨服務派送必須有私有、當下、明確的能力設定與狀態：
- capacity 只接受 available / exhausted / unknown；沒有新鮮可靠證據時預設 unknown。exhausted 或 unknown 都不派送。
- 候選必須明確標成 verified_api；subscription_only 或 unknown 一律升級人工。訂閱狀態、使用百分比、點數不會被轉成 API 存取或額度。
- protocol 必須是該 API endpoint 明確支援並已驗證的 request/response contract；不能只按品牌或訂閱猜。
- capability 需由官方文件或該部署的自有測試確認。
- 只在已驗證 API 存取、可用且相容的候選中套用使用者明確設定的每類工作 priority。這可供私有設定表達既有分工；本 repo 不包含產品名稱、帳戶狀態或實際分工資料。沒有候選時轉人工，不臆造替代服務。
- repo helper 只示範純函式，不讀 dashboard、不連接金鑰。若真實路由設定含帳戶資料，留在私有部署。

## 5. API 費用、訂閱用量與 retry

API token usage、API 美元費用、訂閱用量、請求次數/速率限制、可用協定是不同量。訂閱儀表板的使用百分比或剩餘點數不能直接換算成 API 美元、API token 額度或協定可呼叫性。

只有精確 API rate card 與 usage 分項都已知時才估價：

~~~text
uncached input = input tokens - cached input tokens - cache-write input tokens
API cost = uncached input × input rate
         + cached input × cached-input rate
         + cache-write input × cache-write rate
         + output tokens × output rate
         + 可能另計的工具、運算或網路費
~~~

費率依供應商、模型、deployment、計費區域及查核日期記錄。TypeSafe Models 頁查核時列出 Jev input-token 計價且 output 免費；OpenAI API pricing 依模型及 cache/input/output 分列；Microsoft Foundry 計量依 serverless 或 managed compute deployment 改變。這些 API 費用彼此不同，也不能套用訂閱額度。demo 估價在缺費率、計數不一致或 cache 項目超出總 input 時回傳 unknown，不用訂閱百分比補估。

重試以整個任務為單位：
- maxTotalAttempts 是所有已完成/啟動嘗試總數，不是同時執行數。
- 每次重試都合併前次費用與下一次預估；設定預算但有任一成本未知時停止自動 retry。
- 記錄服務、rate card 查核時間、分項 token 與每次嘗試結果；工具/運算費需另計。
- demo helper 只檢查傳入估值，不發重試，也不追蹤任務。

## 6. Subagent：分類建議與 executor 硬限制

從目前 repo 無法重現外部測試為何多開 subagent：README 與 demo 沒有 Claude Code、Codex、Pi 或其他真實 executor 控制點，也沒有 spawn 記錄可分析。若外部 executor 在提示分類後仍多開，可能原因需在該 executor 的實際啟動與重試路徑查明；分類標籤或提示只是建議，研究網站不能限制 executor。先前討論過「最多一個 subagent」只是未採用的提案，不能寫成已實作政策。

保守的**未實作設計建議**：

~~~json
{
  "defaultMaxTotalSubagentsPerTask": 0,
  "perTaskTotalSubagentLimit": 0,
  "allowNested": false
}
~~~

只有執行層確實支援且使用者明確授權時，才對單一任務設定正整數 perTaskTotalSubagentLimit。它代表整棵 task tree 的總 spawn 次數，不是同時數；不可巢狀。唯一 spawn gateway 要在每次啟動前原子檢查並消耗額度；失敗/取消、retry、resume 不退還次數；替代啟動路徑也須共用 gateway。prompt、分類器標籤、範例或併發上限都不是硬限制。

若未來 repo 加入 executor，測試必須涵蓋：預設 0；每任務自訂總額；循序達額拒絕；巢狀拒絕；並行搶額不超出總額；失敗後 retry/resume 不退還；CLI/API/plugin/替代 spawn 路徑共用 ledger；unknown/manual review 不啟動。目前沒有執行層，所以沒有這類硬限制測試，也沒有改任何全域 Claude/Codex/Pi 設定。

## 7. 測試與證據

原 repo 沒有測試 workflow。新增 Bun 測試只檢查離線 helper、合成 holdout 分離、容量/協定、費用與 retry 分支；不驗證真實模型表現、供應商訂閱/API 存取、部署後可用性或 subagent executor 限制。執行結果以 PR/Actions 的同一提交狀態及發布後頁面為準。
