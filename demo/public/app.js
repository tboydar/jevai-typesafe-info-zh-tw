/* Jev 決策測試台 — 前端邏輯 */

const $ = (sel) => document.querySelector(sel);
const questionsEl = $("#questions");
const stateEl = $("#state");
const statusEl = $("#status");
const resultPanel = $("#result-panel");
const summaryEl = $("#summary");
const rawEl = $("#raw");

let questionRows = [];

function el(tag, attrs = {}, text = "") {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  if (text) node.textContent = text;
  return node;
}

/* ── 問題列 ─────────────────────────────── */
function typeMeta(type) {
  return {
    noul: { label: "noul（是/否・0–1）", criteriaNeeded: false, criteriaPlaceholder: "(不需 criteria)" },
    choice: { label: "choice（選項）", criteriaNeeded: true, criteriaPlaceholder: '{"billing":"帳務問題","bug":"產品異常"}' },
    score: { label: "score（分數・2–10）", criteriaNeeded: false, criteriaPlaceholder: "(可選，如下方 legend 說明)" },
  }[type];
}

function addQuestionRow(def = null) {
  const id = questionRows.length;
  const row = {
    name: def?.name || "",
    type: def?.type || "choice",
    instructions: def?.instructions || "",
    criteria: def?.criteria || "",
  };
  questionRows.push(row);

  const box = el("div", { class: "question" });
  row.node = box;

  const head = el("div", { class: "q-head" });
  head.append(
    el("span", { class: "q-title" }, `問題 ${id + 1}`),
    el("button", { class: "btn danger", type: "button" }, "刪除")
  );
  head.querySelector("button").onclick = () => {
    questionRows = questionRows.filter((r) => r !== row);
    box.remove();
    refreshQNumbers();
  };

  const grid = el("div", { class: "q-grid" });
  grid.append(
    field("name", "名稱（key）", "input", "text", "text", { placeholder: "topic" }),
    field("type", "型別", "select", null, null, {}),
    field("instructions", "說明（instructions）", "input", "text", "text", { placeholder: "這個問題在問什麼？" })
  );

  const typeSel = grid.querySelector('select[name="type"]');
  ["noul", "choice", "score"].forEach((t) => {
    const opt = el("option", { value: t }, typeMeta(t).label);
    typeSel.append(opt);
  });
  typeSel.value = row.type;

  // criteria（JSON 物件）
  const critWrap = el("div", { class: "q-criteria" });
  const crit = el("textarea", {
    class: "criteria",
    name: "criteria",
    rows: "2",
    spellcheck: "false",
  });
  crit.value = row.criteria;
  const critLabel = el("label", {}, "criteria（JSON 物件）");
  critWrap.append(critLabel, crit);

  // 依型別切換 criteria 顯示/佔位
  function refreshFields() {
    const m = typeMeta(row.type);
    critLabel.textContent = m.criteriaNeeded ? "criteria（JSON 物件）" : "criteria（選填）";
    crit.placeholder = m.criteriaPlaceholder;
    critWrap.hidden = !m.criteriaNeeded; // noul 不顯示；choice/score 顯示
  }

  typeSel.onchange = () => {
    row.type = typeSel.value;
    refreshFields();
  };
  grid.querySelector('input[name="name"]').oninput = (e) => (row.name = e.target.value.trim());
  grid.querySelector('input[name="instructions"]').oninput = (e) => (row.instructions = e.target.value.trim());
  crit.oninput = (e) => (row.criteria = e.target.value.trim());

  box.append(head, grid, critWrap);
  questionsEl.append(box);

  // 預設第一個問題填入範例
  if (def) {
    grid.querySelector('input[name="name"]').value = def.name;
    grid.querySelector('input[name="instructions"]').value = def.instructions;
    crit.value = def.criteria || "";
  }

  refreshFields();
  return row;
}

function field(name, label, tag, type, inputName, attrs = {}) {
  const wrap = el("div", {});
  wrap.append(el("label", { for: "f-" + name }, label));
  const node = tag === "select"
    ? el("select", { name, ...attrs })
    : el("input", { name, type, "data-field": inputName, ...attrs });
  wrap.append(node);
  return wrap;
}

function refreshQNumbers() {
  questionRows.forEach((row, i) => {
    row.node.querySelector(".q-title").textContent = `問題 ${i + 1}`;
  });
}

/* ── 送出 ───────────────────────────────── */
function buildRequest() {
  const questions = {};
  for (const row of questionRows) {
    const name = row.name.trim() || "q" + (questionRows.indexOf(row) + 1);
    const q = { type: row.type, instructions: row.instructions.trim() || "請判斷" };
    if (row.type !== "noul" && row.criteria.trim()) {
      try {
        q.criteria = JSON.parse(row.criteria);
      } catch (e) {
        statusEl.textContent = `問題「${name}」的 criteria 不是合法 JSON：${e.message}`;
        statusEl.className = "status err";
        return null;
      }
    }
    questions[name] = q;
  }
  if (Object.keys(questions).length === 0) {
    statusEl.textContent = "請至少新增一個問題";
    statusEl.className = "status err";
    return null;
  }
  return { model: "jev-latest", state: stateEl.value.trim(), questions };
}

async function run() {
  const req = buildRequest();
  if (!req) return;

  const runBtn = $("#run");
  runBtn.disabled = true;
  statusEl.className = "status";
  statusEl.textContent = "送出中…";
  resultPanel.hidden = true;

  try {
    const res = await fetch("/api/systemone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (!res.ok) {
      statusEl.textContent = `API 錯誤：${data.error || res.status}`;
      statusEl.className = "status err";
      return;
    }
    renderResult(data);
    statusEl.textContent = `完成 · 模型 ${data.model || "—"}`;
  } catch (e) {
    statusEl.textContent = `請求失敗：${e.message}`;
    statusEl.className = "status err";
  } finally {
    runBtn.disabled = false;
  }
}

/* ── 渲染結果 ───────────────────────────── */
function renderProbs(probs) {
  if (!probs || typeof probs !== "object" || Object.keys(probs).length === 0) return "";
  const bars = el("div", { class: "bars" });
  for (const [k, v] of Object.entries(probs)) {
    const rowEl = el("div", { class: "bar-row" });
    const bar = el("div", { class: "bar" });
    bar.append(el("i", { style: `width:${Math.round(v * 100)}%` }));
    rowEl.append(el("span", {}, k), bar, el("span", {}, (v * 100).toFixed(0) + "%"));
    bars.append(rowEl);
  }
  return bars;
}

function renderResult(data) {
  summaryEl.innerHTML = "";
  if (!data.answers || typeof data.answers !== "object") {
    summaryEl.append(el("p", { class: "status err" }, "回應中沒有 answers"));
    return;
  }
  for (const [name, ans] of Object.entries(data.answers)) {
    const card = el("div", { class: "answer" });
    const typeTag = el("span", { class: "type" }, ans.type);
    card.append(el("div", { class: "qname" }, `${name}`), typeTag);

    let val = "";
    let meta = "";
    if (ans.type === "noul") {
      val = ans.noul;
      meta = ans.noul > 0.7 ? "傾向「是」" : ans.noul < 0.3 ? "傾向「否」" : "不確定";
    } else if (ans.type === "choice") {
      val = ans.choice ?? "—";
      meta = `信心值 ${ans.confidence ?? "—"}`;
    } else if (ans.type === "score") {
      val = ans.score ?? "—";
      meta = `信心值 ${ans.confidence ?? "—"}` + (ans.legend && ans.legend[Math.round(ans.score)] ? ` · ${ans.legend[Math.round(ans.score)]}` : "");
    }

    card.append(el("div", { class: "val" }, String(val)));
    if (meta) card.append(el("div", { class: "meta" }, meta));
    const probs = renderProbs(ans.type === "choice" ? ans.probabilities : undefined);
    if (probs) card.append(probs);
    summaryEl.append(card);
  }

  rawEl.textContent = JSON.stringify(data, null, 2);
  resultPanel.hidden = false;
}

/* ── 初始化 ─────────────────────────────── */
async function init() {
  // 預設範例：帳務 triage
  addQuestionRow({ name: "topic", type: "choice", instructions: "這個問題的類別是？", criteria: '{"billing":"帳務/扣款問題","bug":"產品異常","other":"其他"}' });
  addQuestionRow({ name: "urgent", type: "noul", instructions: "需要立刻轉真人處理嗎？", criteria: "" });

  // 模式橫幅
  try {
    const h = await (await fetch("/api/health")).json();
    const banner = $("#mode-banner");
    banner.hidden = false;
    if (h.mock) {
      banner.className = "banner mock";
      $("#mode-dot").style.background = "var(--warn)";
      $("#mode-text").textContent = "離線模擬模式：未設定 TYPESAFE_API_KEY，目前回傳模擬回答（僅供測試 UI）";
    } else {
      banner.className = "banner live";
      $("#mode-dot").style.background = "var(--ok)";
      $("#mode-text").textContent = "真實模式：已偵測到 TYPESAFE_API_KEY，將呼叫 api.typesafe.ai/v1/systemone";
    }
  } catch {
    /* 忽略 */
  }

  $("#add-q").onclick = () => addQuestionRow();
  $("#run").onclick = run;
}

init();
