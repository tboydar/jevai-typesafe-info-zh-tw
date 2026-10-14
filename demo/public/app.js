/* Jev 決策測試台 — 前端邏輯
 * 雙模式：
 *   - proxy 模式：由本機 bun + hono server 代理（/api/systemone），可無金鑰離線模擬
 *   - static 模式：GitHub Pages 靜態部署，直接從瀏覽器呼叫使用者的端點＋Token
 */

const $ = (sel) => document.querySelector(sel);
const questionsEl = $("#questions");
const stateEl = $("#state");
const statusEl = $("#status");
const resultPanel = $("#result-panel");
const summaryEl = $("#summary");
const rawEl = $("#raw");

const LS_KEY = "jevai_settings";
const DEFAULT_ENDPOINT = "https://api.typesafe.ai/v1/systemone";

let mode = "proxy"; // 'proxy' | 'static'
let questionRows = [];

/* ── 設定（Token + 端點）──────────────────── */
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}
function saveSettings(s) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}
function getToken() { return ($("#token").value || "").trim(); }
function getEndpoint() {
  const preset = $("#endpoint-preset").value;
  if (preset !== "__custom__") return preset;
  const e = ($("#endpoint").value || "").trim();
  return e || DEFAULT_ENDPOINT;
}

function initSettings() {
  const s = loadSettings();
  if (s.token) $("#token").value = s.token;
  if (s.endpoint && s.endpoint !== DEFAULT_ENDPOINT) {
    $("#endpoint-preset").value = "__custom__";
    $("#endpoint").value = s.endpoint;
    $("#endpoint").hidden = false;
  }
  $("#token").oninput = () => { const t = loadSettings(); t.token = getToken(); saveSettings(t); };
  $("#endpoint-preset").onchange = () => {
    const custom = $("#endpoint-preset").value === "__custom__";
    $("#endpoint").hidden = !custom;
    persistEndpoint();
  };
  $("#endpoint").oninput = persistEndpoint;
  $("#toggle-token").onclick = () => {
    const t = $("#token");
    t.type = t.type === "password" ? "text" : "password";
  };
}
function persistEndpoint() {
  const t = loadSettings();
  t.endpoint = getEndpoint();
  saveSettings(t);
}

/* ── 模式偵測 ────────────────────────────── */
async function detectMode() {
  try {
    const res = await fetch("/api/health", { method: "GET", cache: "no-store" });
    if (res.ok) {
      const h = await res.json();
      return h.mock ? "mock" : "proxy";
    }
  } catch { /* 沒有後端 → 靜態模式 */ }
  return "static";
}

function renderModeBanner() {
  const banner = $("#mode-banner");
  banner.hidden = false;
  const dot = $("#mode-dot");
  if (mode === "static") {
    banner.className = "banner transpose";
    dot.style.background = "var(--accent)";
    $("#mode-text").textContent = "GitHub Pages 靜態模式：請在上方填入 API Token（可選自訂端點），將直接從瀏覽器呼叫。";
  } else if (mode === "mock") {
    banner.className = "banner mock";
    dot.style.background = "var(--warn)";
    $("#mode-text").textContent = "離線模擬模式：未設定 TYPESAFE_API_KEY，目前回傳模擬回答（僅供測試 UI）。";
  } else {
    banner.className = "banner live";
    dot.style.background = "var(--ok)";
    $("#mode-text").textContent = "真實模式：已偵測到後端 proxy，將由本機伺服器呼叫 api.typesafe.ai。";
  }
  $("#conn-msg").textContent = mode === "static" ? "Token 僅存於本瀏覽器 localStorage，不會外送。" : "此模式由後端 proxy 處理金鑰，前端不需填 Token。";
}

/* ── 問題列 ─────────────────────────────── */
function typeMeta(type) {
  return {
    noul: { label: "noul（是/否・0–1）", criteriaNeeded: false, criteriaPlaceholder: "(不需 criteria)" },
    choice: { label: "choice（選項）", criteriaNeeded: true, criteriaPlaceholder: '{"billing":"帳務問題","bug":"產品異常"}' },
    score: { label: "score（有序量表・2–10 個等級）", criteriaNeeded: true, criteriaPlaceholder: '["輕微","中等","嚴重"]' },
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
    field("name", "名稱（key）", "input", null, { placeholder: "topic" }),
    field("type", "型別", "select", null, {}),
    field("instructions", "說明（instructions）", "input", null, { placeholder: "這個問題在問什麼？" })
  );

  const typeSel = grid.querySelector('select[name="type"]');
  ["noul", "choice", "score"].forEach((t) => {
    const opt = el("option", { value: t }, typeMeta(t).label);
    typeSel.append(opt);
  });
  typeSel.value = row.type;

  const critWrap = el("div", { class: "q-criteria" });
  const crit = el("textarea", { class: "criteria", name: "criteria", rows: "2", spellcheck: "false" });
  crit.value = row.criteria;
  const critLabel = el("label", {}, "criteria（JSON 物件）");
  critWrap.append(critLabel, crit);

  function refreshFields() {
    const m = typeMeta(row.type);
    crit.placeholder = m.criteriaPlaceholder;
    critLabel.textContent = row.type === "score"
      ? "criteria（JSON array；2–10 個有序等級）"
      : "criteria（JSON 物件；choice 需 1–255 個選項）";
    critWrap.hidden = !m.criteriaNeeded;
  }

  typeSel.onchange = () => { row.type = typeSel.value; refreshFields(); };
  grid.querySelector('input[name="name"]').oninput = (e) => (row.name = e.target.value.trim());
  grid.querySelector('input[name="instructions"]').oninput = (e) => (row.instructions = e.target.value.trim());
  crit.oninput = (e) => (row.criteria = e.target.value.trim());

  box.append(head, grid, critWrap);
  questionsEl.append(box);

  if (def) {
    grid.querySelector('input[name="name"]').value = def.name;
    grid.querySelector('input[name="instructions"]').value = def.instructions;
    crit.value = def.criteria || "";
  }

  refreshFields();
  return row;
}

function field(name, label, tag, inputName, attrs = {}) {
  const wrap = el("div", {});
  wrap.append(el("label", { for: "f-" + name }, label));
  const attrs2 = Object.assign({ name }, attrs);
  wrap.append(tag === "select" ? el("select", attrs2) : el("input", attrs2));
  return wrap;
}

function el(tag, attrs = {}, text = "") {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  if (text) node.textContent = text;
  return node;
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
    if (row.type !== "noul") {
      if (!row.criteria.trim()) {
        setStatus(`問題「${name}」需要 criteria`, true);
        return null;
      }
      try { q.criteria = JSON.parse(row.criteria); }
      catch (e) {
        setStatus(`問題「${name}」的 criteria 不是合法 JSON：${e.message}`, true);
        return null;
      }
      if (row.type === "choice" && (!q.criteria || Array.isArray(q.criteria) || typeof q.criteria !== "object" || Object.keys(q.criteria).length < 1 || Object.keys(q.criteria).length > 255)) {
        setStatus(`問題「${name}」的 choice criteria 必須是 1–255 個選項的 JSON 物件`, true);
        return null;
      }
      if (row.type === "score" && (!Array.isArray(q.criteria) || q.criteria.length < 2 || q.criteria.length > 10)) {
        setStatus(`問題「${name}」的 score criteria 必須是 2–10 個有序等級的 JSON array`, true);
        return null;
      }
    }
    questions[name] = q;
  }
  if (Object.keys(questions).length === 0) { setStatus("請至少新增一個問題", true); return null; }
  return { model: "jev-latest", state: stateEl.value.trim(), questions };
}

function setStatus(msg, isErr = false) {
  statusEl.textContent = msg;
  statusEl.className = isErr ? "status err" : "status";
}

async function run() {
  const req = buildRequest();
  if (!req) return;

  const runBtn = $("#run");
  runBtn.disabled = true;
  setStatus("送出中…");
  resultPanel.hidden = true;

  let data, res;
  try {
    if (mode === "static") {
      const token = getToken();
      if (!token) {
        setStatus("GitHub Pages 模式下請先在上方填入 API Token", true);
        runBtn.disabled = false;
        return;
      }
      res = await fetch(getEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(req),
      });
    } else {
      res = await fetch("/api/systemone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
    }
    data = await res.json();
    if (!res.ok) {
      setStatus(`API 錯誤（${res.status}）：${data?.error || JSON.stringify(data) || res.statusText}`, true);
      return;
    }
    renderResult(data);
    setStatus(`完成 · 模型 ${data.model || "—"} · ${(data.usage?.input_tokens ?? "") ? `in:${data.usage.input_tokens} out:${data.usage.output_tokens}` : ""}`);
  } catch (e) {
    setStatus(`請求失敗：${e.message}`, true);
  } finally {
    runBtn.disabled = false;
  }
}

/* ── 渲染結果 ───────────────────────────── */
function renderProbs(probs, legend = null) {
  if (!probs || typeof probs !== "object") return "";
  const keys = Object.keys(probs);
  if (!keys.length) return "";
  const bars = el("div", { class: "bars" });
  for (const k of keys) {
    const v = probs[k];
    const rowEl = el("div", { class: "bar-row" });
    const bar = el("div", { class: "bar" });
    bar.append(el("i", { style: `width:${Math.round(v * 100)}%` }));
    rowEl.append(el("span", { class: "bk" }, legend?.[k] || k), bar, el("span", {}, (v * 100).toFixed(0) + "%"));
    bars.append(rowEl);
  }
  return bars;
}

function renderResult(data) {
  summaryEl.innerHTML = "";
  if (!data.answers || typeof data.answers !== "object") {
    summaryEl.append(el("p", { class: "status err" }, "回應中沒有 answers：\n" + JSON.stringify(data, null, 2)));
    return;
  }
  for (const [name, ans] of Object.entries(data.answers)) {
    const card = el("div", { class: "answer" });
    const typeTag = el("span", { class: "type" }, ans.type);
    card.append(el("div", { class: "qname" }, name), typeTag);

    let val = "", meta = "";
    if (ans.type === "noul") {
      val = ans.noul;
      meta = "回答為「是」的機率；不是獨立信心值。門檻需依用途驗證。";
    } else if (ans.type === "choice") {
      val = ans.choice ?? "—";
      meta = `信心值 ${ans.confidence ?? "—"}`;
    } else if (ans.type === "score") {
      val = ans.score ?? "—";
      meta = `有序等級上的機率加權位置 · 信心值 ${ans.confidence ?? "—"}`;
    }
    card.append(el("div", { class: "val" }, String(val)));
    if (meta) card.append(el("div", { class: "meta" }, meta));
    const probs = renderProbs(ans.type === "choice" || ans.type === "score" ? ans.probabilities : null, ans.legend);
    if (probs) card.append(probs);
    summaryEl.append(card);
  }

  rawEl.textContent = JSON.stringify(data, null, 2);
  rawEl.scrollTop = 0;
  resultPanel.hidden = false;
}

/* ── 初始化 ─────────────────────────────── */
async function init() {
  initSettings();

  // 預設範例：帳務 triage
  addQuestionRow({ name: "topic", type: "choice", instructions: "這個問題的類別是？", criteria: '{"billing":"帳務/扣款問題","bug":"產品異常","other":"其他"}' });
  addQuestionRow({ name: "urgent", type: "noul", instructions: "需要立刻轉真人處理嗎？", criteria: "" });

  mode = await detectMode();
  renderModeBanner();

  $("#add-q").onclick = () => addQuestionRow();
  $("#run").onclick = run;
}

init();
