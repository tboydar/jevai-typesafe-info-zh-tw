/** TypeSafe /v1/systemone request / response shape，依官方文件查核 */

export type QuestionType = "noul" | "choice" | "score";

export type CriteriaValue =
  | string
  | Record<string, unknown>
  | unknown[]
  | null;

export interface NoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
}

export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, CriteriaValue>;
}

export type ScoreLevel = CriteriaValue;

export interface ScoreQuestion {
  type: "score";
  instructions: string;
  criteria: ScoreLevel[];
}

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface SystemOneRequest {
  model: string;
  state: string;
  questions: Record<string, Question>;
}

/** Jev 回應欄位；Noul 沒有獨立 confidence 欄位。 */
export interface NoulAnswer {
  type: "noul";
  noul: number;
}

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities?: Record<string, number>;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  probabilities?: Record<string, number>;
  legend?: Record<string, string>;
}

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface SystemOneResponse {
  model: string;
  answers: Record<string, Answer>;
  usage?: { input_tokens: number; output_tokens: number };
  error?: string;
}
