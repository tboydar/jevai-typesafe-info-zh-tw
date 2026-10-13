import type { SystemOneRequest, SystemOneResponse, Answer } from "./types";

/**
 * 沒有設定 TYPESAFE_API_KEY 時的離線模擬模式。
 * 產生「看起來合理」的示範回答，方便不帶金鑰直接測試 UI 流程。
 */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function mockResponse(req: SystemOneRequest): SystemOneResponse {
  const answers: Record<string, Answer> = {};
  const keys = Object.keys(req.questions || {});

  for (const key of keys) {
    const q = req.questions[key];
    const seed = hash(key + "|" + (req.state || "").slice(0, 40));

    switch (q.type) {
      case "choice": {
        const options = Object.keys(q.criteria || {});
        const pick = options.length ? options[seed % options.length] : key;
        const probabilities = Object.fromEntries(
          options.map((o, i) => [o, o === pick ? 0.8 + ((seed % 20) / 100) : Math.round(((seed + i * 7) % 10) / 100 * 100) / 100])
        );
        answers[key] = { type: "choice", choice: pick, confidence: 1.0, probabilities };
        break;
      }
      case "score": {
        answers[key] = { type: "score", score: 3 + (seed % 7), confidence: 1.0 };
        break;
      }
      default: {
        answers[key] = { type: "noul", noul: Math.round(((seed % 100) / 100) * 100) / 100 };
        break;
      }
    }
  }

  return {
    model: "jev-mock (離線模擬)",
    answers,
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}
