/** Synthetic examples only. Keep the evaluation holdout separate from development. */

export type SyntheticRoutingLabel = "routine" | "reasoning" | "manual_review" | "unknown";

export const developmentCases: ReadonlyArray<{
  id: string;
  label: SyntheticRoutingLabel;
}> = [
  { id: "dev-bounded-format-conversion", label: "routine" },
  { id: "dev-compare-three-public-api-docs", label: "reasoning" },
  { id: "dev-high-impact-access-change", label: "manual_review" },
  { id: "dev-unresolved-laya-product-name", label: "unknown" },
];

export const holdoutCases: ReadonlyArray<{
  id: string;
  label: SyntheticRoutingLabel;
}> = [
  { id: "holdout-one-field-synthetic-ticket", label: "routine" },
  { id: "holdout-reconcile-two-source-conflict", label: "reasoning" },
  { id: "holdout-unknown-provider-protocol", label: "unknown" },
  { id: "holdout-production-access-approval", label: "manual_review" },
];
