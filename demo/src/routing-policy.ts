/**
 * Offline advisory helper used by the public demo and synthetic tests.
 * It is not connected to the Hono proxy, an agent, or an executor.
 */

export type WorkloadAdvice = "routine" | "reasoning" | "manual_review" | "unknown";
export type RoutableAdvice = Extract<WorkloadAdvice, "routine" | "reasoning">;
export type CapacityStatus = "available" | "exhausted" | "unknown";
export type ApiAccessStatus = "verified_api" | "subscription_only" | "unknown";

export interface CandidateProfile {
  id: string;
  capability: string;
  protocol: string;
  /** Subscription access alone is never enough to establish an API route. */
  apiAccess: ApiAccessStatus;
  capacity: CapacityStatus;
  /** Per-workload priorities can encode a private task split without naming plans here. */
  priority: number;
  priorityByAdvice?: Partial<Record<RoutableAdvice, number>>;
}

export interface RouteRequest {
  advice: WorkloadAdvice;
  /** Confidence from the caller's classifier; null/invalid values stop routing. */
  adviceConfidence: number | null;
  /** Caller-supplied threshold fitted to this use case's holdout. */
  minimumConfidence: number;
  requiredCapability: string;
  requiredProtocol: string;
  candidates: CandidateProfile[];
}

export type RouteReason =
  | "selected"
  | "classifier_unknown"
  | "low_confidence"
  | "manual_review_requested"
  | "capability_unavailable"
  | "protocol_unsupported"
  | "api_access_unverified"
  | "capacity_unknown"
  | "capacity_exhausted";

export interface RouteDecision {
  status: "selected" | "manual_review";
  providerId?: string;
  reason: RouteReason;
}

/** Labels are advice only; unknown and manual-review never auto-dispatch. */
export function chooseCandidate(request: RouteRequest): RouteDecision {
  if (request.advice === "unknown") {
    return { status: "manual_review", reason: "classifier_unknown" };
  }
  if (request.advice === "manual_review") {
    return { status: "manual_review", reason: "manual_review_requested" };
  }
  if (
    request.adviceConfidence === null ||
    !Number.isFinite(request.adviceConfidence) ||
    request.adviceConfidence < 0 ||
    request.adviceConfidence > 1 ||
    !Number.isFinite(request.minimumConfidence) ||
    request.minimumConfidence < 0 ||
    request.minimumConfidence > 1
  ) {
    return { status: "manual_review", reason: "classifier_unknown" };
  }
  if (request.adviceConfidence < request.minimumConfidence) {
    return { status: "manual_review", reason: "low_confidence" };
  }

  const capable = request.candidates.filter(
    (candidate) => candidate.capability === request.requiredCapability
  );
  if (capable.length === 0) {
    return { status: "manual_review", reason: "capability_unavailable" };
  }

  const protocolCompatible = capable.filter(
    (candidate) => candidate.protocol === request.requiredProtocol
  );
  if (protocolCompatible.length === 0) {
    return { status: "manual_review", reason: "protocol_unsupported" };
  }

  const apiReady = protocolCompatible.filter(
    (candidate) => candidate.apiAccess === "verified_api"
  );
  if (apiReady.length === 0) {
    return { status: "manual_review", reason: "api_access_unverified" };
  }

  const available = apiReady
    .filter((candidate) => candidate.capacity === "available")
    .sort(
      (a, b) =>
        (a.priorityByAdvice?.[request.advice as RoutableAdvice] ?? a.priority) -
          (b.priorityByAdvice?.[request.advice as RoutableAdvice] ?? b.priority) ||
        a.id.localeCompare(b.id)
    );
  if (available.length > 0) {
    return { status: "selected", providerId: available[0].id, reason: "selected" };
  }

  return apiReady.some((candidate) => candidate.capacity === "unknown")
    ? { status: "manual_review", reason: "capacity_unknown" }
    : { status: "manual_review", reason: "capacity_exhausted" };
}

export interface ApiRateCard {
  inputUsdPerMillion: number;
  cachedInputUsdPerMillion: number;
  cacheWriteUsdPerMillion: number;
  outputUsdPerMillion: number;
}

export interface TokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
}

/** Return null unless every component rate and exact token count is known. */
export function estimateApiCostUsd(usage: TokenUsage, rates: ApiRateCard): number | null {
  const counts = [
    usage.inputTokens,
    usage.cachedInputTokens,
    usage.cacheWriteInputTokens,
    usage.outputTokens,
  ];
  const prices = [
    rates.inputUsdPerMillion,
    rates.cachedInputUsdPerMillion,
    rates.cacheWriteUsdPerMillion,
    rates.outputUsdPerMillion,
  ];
  if (
    counts.some((value) => !Number.isFinite(value) || value < 0) ||
    prices.some((value) => !Number.isFinite(value) || value < 0) ||
    usage.cachedInputTokens + usage.cacheWriteInputTokens > usage.inputTokens
  ) {
    return null;
  }

  const uncachedInput =
    usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteInputTokens;
  const cost =
    (uncachedInput * rates.inputUsdPerMillion +
      usage.cachedInputTokens * rates.cachedInputUsdPerMillion +
      usage.cacheWriteInputTokens * rates.cacheWriteUsdPerMillion +
      usage.outputTokens * rates.outputUsdPerMillion) /
    1_000_000;
  return Number.isFinite(cost) ? cost : null;
}

export interface RetryBudget {
  completedAttempts: number;
  maxTotalAttempts: number;
  /** Include every completed attempt; unknown prices are null. */
  priorAttemptCostsUsd: Array<number | null>;
  nextAttemptEstimateUsd: number | null;
  /** null means no dollar budget was configured. */
  maxTaskSpendUsd: number | null;
}

export type RetryDecisionReason =
  | "within_budget"
  | "attempt_limit"
  | "cost_unknown"
  | "budget_exceeded";

export interface RetryDecision {
  allowed: boolean;
  reason: RetryDecisionReason;
  projectedSpendUsd?: number;
}

/** Counts total attempts for this task, not simultaneous attempts. */
export function canRetry(budget: RetryBudget): RetryDecision {
  if (
    !Number.isInteger(budget.maxTotalAttempts) ||
    budget.maxTotalAttempts < 1 ||
    !Number.isInteger(budget.completedAttempts) ||
    budget.completedAttempts < 0 ||
    budget.completedAttempts >= budget.maxTotalAttempts
  ) {
    return { allowed: false, reason: "attempt_limit" };
  }

  if (budget.maxTaskSpendUsd === null) {
    return { allowed: true, reason: "within_budget" };
  }

  if (
    !Number.isFinite(budget.maxTaskSpendUsd) ||
    budget.maxTaskSpendUsd < 0 ||
    budget.priorAttemptCostsUsd.length !== budget.completedAttempts ||
    budget.priorAttemptCostsUsd.some(
      (cost) => cost === null || !Number.isFinite(cost) || cost < 0
    ) ||
    budget.nextAttemptEstimateUsd === null ||
    !Number.isFinite(budget.nextAttemptEstimateUsd) ||
    budget.nextAttemptEstimateUsd < 0
  ) {
    return { allowed: false, reason: "cost_unknown" };
  }

  const projectedSpendUsd =
    budget.priorAttemptCostsUsd.reduce<number>((total, cost) => total + (cost ?? 0), 0) +
    budget.nextAttemptEstimateUsd;
  if (projectedSpendUsd > budget.maxTaskSpendUsd) {
    return { allowed: false, reason: "budget_exceeded", projectedSpendUsd };
  }
  return { allowed: true, reason: "within_budget", projectedSpendUsd };
}
