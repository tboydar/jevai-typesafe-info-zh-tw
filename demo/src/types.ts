/** 與 TypeSafe /v1/systemone API 對應的型別定義 */

export type QuestionType = "noul" | "choice" | "score";

export interface Question {
  type: QuestionType;
  instructions: string;
  criteria?: Record<string, string>;
}

export interface SystemOneRequest {
  model: string;
  state: string;
  questions: Record<string, Question>;
}

/** Jev 各原語的回答型別 */
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
