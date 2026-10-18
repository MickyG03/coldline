import { choice, noul, score, TypeSafeClient, type ContentValue } from "@typesafe-ai/sdk";
import type { JevLabels, StorageType } from "../../database/models/index.ts";
import { env } from "../../utils/env.ts";

// TypeSafe Jev glue: two judgments, each returning plain labels + confidences.
// Business rules that act on these live in src/services (intake, coordinator).

let client: TypeSafeClient | undefined;
const jev = () => (client ??= new TypeSafeClient({ apiKey: env("TYPESAFE_API_KEY"), defaultModel: "jev-latest" }));

/** A noul probability's distance from a coin flip, as 0..1 confidence. */
export const noulConfidence = (p: number) => Math.abs(2 * p - 1);

export interface TriageResult {
  storageType: StorageType;
  storageConfidence: number;
  /** 0 holding in range .. 3 already out of range (expected value, may be fractional). */
  urgencyScore: number;
  urgencyConfidence: number;
  /** Probability an excursion has already occurred. */
  excursion: number;
  labels: JevLabels;
}

export interface AnswerJudgment {
  answerStatus: "definite" | "conditional" | "contradictory" | "incomplete";
  answerConfidence: number;
  /** Probability the facility can take the units. */
  hasCapacity: number;
  /** Probability acceptance hinges on a condition. */
  hasCondition: number;
  labels: JevLabels;
}

export type JudgeState = Record<string, ContentValue>;

export interface Judge {
  triage(state: JudgeState): Promise<TriageResult>;
  judgeAnswer(state: JudgeState): Promise<AnswerJudgment>;
}

export const URGENCY_RUBRIC = [
  "Holding: the unit is still within its labeled storage range and stable.",
  "Rising: temperature is drifting but there are several hours before it leaves range.",
  "Rising fast: under about an hour before the product leaves its storage range.",
  "Already out of range: the product has left its labeled storage range.",
] as const;

export const jevJudge: Judge = {
  async triage(state) {
    const { answers } = await jev().systemOne({
      state,
      questions: {
        storage_type: choice("Which storage class does this product require?", {
          refrigerated: "2 to 8 °C vaccine refrigerator",
          frozen: "-50 to -15 °C freezer",
          "ultra-cold": "-90 to -60 °C ultra-low freezer",
        }),
        urgency: score("How urgent is moving this inventory?", URGENCY_RUBRIC),
        excursion_occurred: noul("Has the product already gone outside its labeled storage temperature range?"),
      },
    });
    const s = answers.storage_type, u = answers.urgency, e = answers.excursion_occurred;
    return {
      storageType: s.choice,
      storageConfidence: s.confidence,
      urgencyScore: u.score,
      urgencyConfidence: u.confidence,
      excursion: e.noul,
      labels: {
        ...Object.fromEntries(Object.entries(s.probabilities).map(([k, v]) => [`storage:${k}`, v])),
        urgency_score: u.score,
        urgency_confidence: u.confidence,
        excursion_occurred: e.noul,
      },
    };
  },

  async judgeAnswer(state) {
    const { answers } = await jev().systemOne({
      state,
      questions: {
        answer_status: choice("How clear is the coordinator's answer to the storage request?", {
          definite: "A clear yes or no with no strings attached",
          conditional: "Yes, but only if some condition or caveat is met (paperwork, partial quantity, approval). A normal receiving cutoff time (e.g. \"we receive until 6 pm\") is NOT a condition; it is checked separately.",
          contradictory: "The coordinator said things that conflict with each other",
          incomplete: "Key information (capacity, receiving time) is missing or vague",
        }),
        has_capacity: noul("Does the facility say it has room for the requested units?"),
        has_condition: noul("Does acceptance depend on a condition or caveat beyond the stated receiving cutoff? A normal receiving cutoff time (e.g. \"we receive until 6 pm\") is NOT a condition; it is checked separately."),
      },
    });
    const a = answers.answer_status;
    return {
      answerStatus: a.choice,
      answerConfidence: a.confidence,
      hasCapacity: answers.has_capacity.noul,
      hasCondition: answers.has_condition.noul,
      labels: {
        ...a.probabilities,
        answer_confidence: a.confidence,
        has_capacity: answers.has_capacity.noul,
        has_condition: answers.has_condition.noul,
      },
    };
  },
};
