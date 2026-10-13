import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import type { SystemOneRequest } from "./types";
import { mockResponse } from "./mock";

const app = new Hono();

const API_BASE = "https://api.typesafe.ai/v1";
const API_KEY = process.env.TYPESAFE_API_KEY?.trim() ?? "";
const PORT = Number(process.env.PORT || 3000);
const MOCK = false; // 見下方說明：改為 true 一律走模擬

/**
 * 模式判斷：
 *  - 有 TYPESAFE_API_KEY  → 真實呼叫 api.typesafe.ai
 *  - 沒有                → 離線模擬回答（mock），方便不帶金鑰測試
 *  - MOCK=true           → 強制離線模擬
 */
function isMock(): boolean {
  if (MOCK) return true;
  return API_KEY === "";
}

app.get("/api/health", (c) =>
  c.json({ ok: true, mock: isMock(), key_set: API_KEY !== "" })
);

// 直接代理到 TypeSafe /v1/systemone，前端只需同源呼叫
app.post("/api/systemone", async (c) => {
  const body = (await c.req.json()) as SystemOneRequest;

  if (!body || typeof body.state !== "string" || !body.questions) {
    return c.json({ error: "缺少 state 或 questions" }, 400);
  }

  if (isMock()) {
    await new Promise((r) => setTimeout(r, 250)); // 模擬網路延遲
    return c.json(mockResponse(body));
  }

  const res = await fetch(`${API_BASE}/systemone`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return c.json(data, res.status);
});

app.use("/*", serveStatic({ root: "./public" }));

export default {
  port: PORT,
  fetch: app.fetch,
};
