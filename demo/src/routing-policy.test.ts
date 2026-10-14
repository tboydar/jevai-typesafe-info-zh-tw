import { describe, expect, test } from "bun:test";
import {
  canRetry,
  chooseCandidate,
  estimateApiCostUsd,
  type CandidateProfile,
} from "./routing-policy";
import { developmentCases, holdoutCases } from "./routing-policy.fixtures";

const profiles: CandidateProfile[] = [
  { id: "synthetic-api-a", capability: "typed-classification", protocol: "https-json", apiAccess: "verified_api", capacity: "available", priority: 2 },
  { id: "synthetic-api-b", capability: "typed-classification", protocol: "https-json", apiAccess: "verified_api", capacity: "available", priority: 1 },
];

describe("offline advisory route policy", () => {
  test("unknown and manual-review labels never dispatch", () => {
    for (const advice of ["unknown", "manual_review"] as const) {
      expect(chooseCandidate({
        advice, adviceConfidence: 0.95, minimumConfidence: 0.8, requiredCapability: "typed-classification",
        requiredProtocol: "https-json", candidates: profiles,
      }).status).toBe("manual_review");
    }
  });

  test("low or missing confidence escalates before selecting a service", () => {
    for (const adviceConfidence of [0.69, null] as const) {
      const result = chooseCandidate({
        advice: "routine", adviceConfidence, minimumConfidence: 0.7,
        requiredCapability: "typed-classification", requiredProtocol: "https-json",
        candidates: profiles,
      });
      expect(result.status).toBe("manual_review");
      expect(result.reason).toBe(adviceConfidence === null ? "classifier_unknown" : "low_confidence");
    }
  });

  test("exhausted and unknown capacity are escalated", () => {
    for (const capacity of ["exhausted", "unknown"] as const) {
      const result = chooseCandidate({
        advice: "routine", adviceConfidence: 0.95, minimumConfidence: 0.8, requiredCapability: "typed-classification",
        requiredProtocol: "https-json",
        candidates: profiles.map((candidate) => ({ ...candidate, capacity })),
      });
      expect(result.status).toBe("manual_review");
      expect(result.reason).toBe(capacity === "unknown" ? "capacity_unknown" : "capacity_exhausted");
    }
  });

  test("protocol mismatch cannot be silently routed", () => {
    expect(chooseCandidate({
      advice: "reasoning", adviceConfidence: 0.95, minimumConfidence: 0.8, requiredCapability: "typed-classification",
      requiredProtocol: "https-json",
      candidates: profiles.map((candidate) => ({ ...candidate, protocol: "local-python" })),
    })).toEqual({ status: "manual_review", reason: "protocol_unsupported" });
  });

  test("subscription-only or unknown access is not treated as API availability", () => {
    for (const apiAccess of ["subscription_only", "unknown"] as const) {
      const result = chooseCandidate({
        advice: "routine", adviceConfidence: 0.95, minimumConfidence: 0.8,
        requiredCapability: "typed-classification", requiredProtocol: "https-json",
        candidates: profiles.map((candidate) => ({ ...candidate, apiAccess })),
      });
      expect(result).toEqual({ status: "manual_review", reason: "api_access_unverified" });
    }
  });

  test("uses only available, compatible candidates and honors explicit priority", () => {
    const result = chooseCandidate({
      advice: "routine", adviceConfidence: 0.95, minimumConfidence: 0.8, requiredCapability: "typed-classification",
      requiredProtocol: "https-json",
      candidates: [
        { ...profiles[0], capacity: "unknown", priority: 0 },
        { ...profiles[1], priority: 2 },
        { ...profiles[1], id: "synthetic-unrelated", capability: "text-generation", priority: 0 },
      ],
    });
    expect(result).toEqual({ status: "selected", providerId: "synthetic-api-b", reason: "selected" });
  });

  test("allows private workload-specific priority without embedding plan names", () => {
    const candidates = [
      { ...profiles[0], priorityByAdvice: { routine: 0, reasoning: 2 } },
      { ...profiles[1], priorityByAdvice: { routine: 1, reasoning: 0 } },
    ];
    const base = {
      adviceConfidence: 0.95,
      minimumConfidence: 0.8,
      requiredCapability: "typed-classification",
      requiredProtocol: "https-json",
      candidates,
    };
    expect(chooseCandidate({ ...base, advice: "routine" }).providerId).toBe("synthetic-api-a");
    expect(chooseCandidate({ ...base, advice: "reasoning" }).providerId).toBe("synthetic-api-b");
  });
});

describe("API cost estimate and retry budget", () => {
  test("prices uncached input, cached input, cache writes, and output separately", () => {
    expect(estimateApiCostUsd(
      { inputTokens: 1_000_000, cachedInputTokens: 200_000, cacheWriteInputTokens: 100_000, outputTokens: 300_000 },
      { inputUsdPerMillion: 3, cachedInputUsdPerMillion: 0.3, cacheWriteUsdPerMillion: 4, outputUsdPerMillion: 15 },
    )).toBeCloseTo(7.06);
  });

  test("returns unknown for overlapping input buckets", () => {
    expect(estimateApiCostUsd(
      { inputTokens: 10, cachedInputTokens: 6, cacheWriteInputTokens: 5, outputTokens: 1 },
      { inputUsdPerMillion: 1, cachedInputUsdPerMillion: 1, cacheWriteUsdPerMillion: 1, outputUsdPerMillion: 1 },
    )).toBeNull();
  });

  test("includes completed attempts before deciding whether another fits", () => {
    expect(canRetry({
      completedAttempts: 2, maxTotalAttempts: 4, priorAttemptCostsUsd: [0.55, 0.35],
      nextAttemptEstimateUsd: 0.2, maxTaskSpendUsd: 1,
    })).toEqual({ allowed: false, reason: "budget_exceeded", projectedSpendUsd: 1.1 });
  });

  test("unknown cost stops retry when a dollar budget is set", () => {
    expect(canRetry({
      completedAttempts: 1, maxTotalAttempts: 3, priorAttemptCostsUsd: [null],
      nextAttemptEstimateUsd: 0.1, maxTaskSpendUsd: 1,
    })).toEqual({ allowed: false, reason: "cost_unknown" });
  });

  test("attempt cap counts total attempts, not simultaneous attempts", () => {
    expect(canRetry({
      completedAttempts: 3, maxTotalAttempts: 3, priorAttemptCostsUsd: [0, 0, 0],
      nextAttemptEstimateUsd: 0, maxTaskSpendUsd: 1,
    })).toEqual({ allowed: false, reason: "attempt_limit" });
  });
});

test("synthetic holdout stays disjoint from development", () => {
  const developmentIds = new Set(developmentCases.map((example) => example.id));
  expect(developmentCases.every((example) => example.id.startsWith("dev-"))).toBe(true);
  expect(holdoutCases.every((example) => example.id.startsWith("holdout-"))).toBe(true);
  expect(holdoutCases.every((example) => !developmentIds.has(example.id))).toBe(true);
});
