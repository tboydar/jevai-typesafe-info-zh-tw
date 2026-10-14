# 來源、名詞與查核日期

本倉庫是第三方正體中文研究整合與示範程式，並非 TypeSafe、Convai Innovations、OpenAI 或 Microsoft 的官方文件。

## 查核紀錄

研究來源與產品身分於 **2026-10-14** 查核。版本、價格、功能與授權可能變更；請以連結上的即時官方內容為準。產品能力摘要是對公開文件的整理，不代表獨立效能驗證或公司關係判定。

| 主題 | 可核實名稱與範圍 | 查核依據 |
|---|---|---|
| TypeSafe / Jev | TypeSafe 官方文件把 System One 描述為決策模型能力；Jev 是其模型。若「Decision API」指官方 System One endpoint，端點是 POST /v1/systemone；官方文件未把它列為另一個產品名稱。若指其他 API，身分未知。 | [System One](https://docs.typesafe.ai/concepts/system-one)、[API](https://docs.typesafe.ai/api)、[TypeSafe 公告](https://typesafe.ai/blog/introducing-system-one-models-and-jev) |
| System One 原語 | Noul 是 yes/no 機率；Choice 是固定選項及機率分布；Score 是有序等級位置、機率分布及信心值。Noul 沒有獨立 confidence 欄位。 | [Noul](https://docs.typesafe.ai/primitives/noul)、[Choice](https://docs.typesafe.ai/primitives/choice)、[Score](https://docs.typesafe.ai/primitives/score)、[Confidence](https://docs.typesafe.ai/confidence) |
| Jev 版本與價格 | 官方 Models 頁查核時列出 Jev 1.13、API 識別字 jev-1.13.0 / jev-latest，並說明當時 input-token 費率和 API rate limits。價格與限額可能變動；不公開帳戶用量快照。 | [Models](https://docs.typesafe.ai/models)、[API](https://docs.typesafe.ai/api) |
| Laya | 「Laya」可能指 Hugging Face 的 convaiinnovations/laya 模型家族。本次依該 model card 查核：模型卡描述自架 typed decision 模型、依語言/文字特徵選該家族 checkpoint，並宣稱 laya-serve 相容 Jev HTTP shape。這不等於跨供應商路由、訂閱額度路由或雲端服務。僅憑 publisher 字串不能推定與同名 Convai 產品/公司有關。若指別的產品，身分未知；模型卡效能宣稱需獨立驗證。 | [Laya model card](https://huggingface.co/convaiinnovations/laya)、[模型程式庫](https://github.com/NandhaKishorM/laya) |
| OpenAI / GPT | OpenAI API 的 Structured Outputs 可在支援模型/schema 範圍內約束 JSON Schema 形狀；function calling 是另一種工具介面。格式約束不等於分類內容正確，仍須處理拒答、截斷及語意錯誤。API 費率依模型及 input、cached input、cache write、output 等項目查當日價格。ChatGPT 訂閱和 API Platform 是分開計費；訂閱不代表 API 可用額度。 | [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)、[Function calling](https://developers.openai.com/api/docs/guides/function-calling)、[API pricing](https://developers.openai.com/api/docs/pricing)、[ChatGPT/API separate billing](https://help.openai.com/en/articles/9039756) |
| Microsoft | Foundry 模型可透過 REST 使用；官方文件分別描述 serverless token 計量與受管理運算資源費用。Microsoft 365 Copilot APIs 是 M365 產品能力的獨立 API，文件提及授權要求。Foundry、M365 Copilot 與 GitHub Copilot 是不同產品。GitHub Copilot 是否是此需求中的通用決策 API，本次查核未知。 | [Foundry models](https://learn.microsoft.com/en-us/azure/foundry/concepts/foundry-models-overview)、[Foundry costs](https://learn.microsoft.com/en-us/azure/foundry/concepts/manage-costs)、[M365 Copilot APIs](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/copilot-apis-overview) |

## 名詞對照

| 名詞 | 本文件用法 |
|---|---|
| System One | TypeSafe 官方文件中的決策模型能力名稱；不泛指所有 System 1 理論或分類器。 |
| Decision API | 有歧義。本倉庫只在有官方 endpoint 證據時指 TypeSafe 的 POST /v1/systemone。 |
| Noul | yes/no 問題的 yes 機率，0–1；不是信心值。 |
| Choice | 固定類別中選一項；官方文件列有各選項機率與 confidence。 |
| Score | 在有序描述等級上的機率加權位置，可為小數；範圍由等級數決定。 |
| unknown | 缺乏足夠證據確認身分、能力、協定或容量；不可自動視為可用。 |
| manual review | 人工裁定/升級結果；不是模型類別猜測。 |

## 授權與界線

- Jev、System One、TypeSafe AI 與其他品牌商標屬各自權利人。
- 原始社群參考只作來源歸屬；實際行為以對應官方 API 文件為準。
- demo 未設定 TYPESAFE_API_KEY 時回傳合成 mock，不代表真實模型輸出。
- 本 demo 不代替供應商授權條款、官方 API 文件或計費頁面。
