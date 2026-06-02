import { createHash } from "node:crypto";
import { redisConnection } from "../config/redis.js";
import { PaperSchema, type GeneratedPaper } from "./paperSchema.js";

export interface CacheInput {
  title: string;
  questionTypes: string[];
  numQuestions: number;
  totalMarks: number;
  instructions?: string;
  sourceText?: string;
}

const CACHE_PREFIX = "paper:cache:";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h

/**
 * Stable cache key derived from the meaningful inputs.
 * - title normalized to NFC + trimmed + collapsed whitespace + lowercased
 * - questionTypes sorted + deduped so order doesn't change the key
 * - other strings trimmed
 */
export function cacheKey(input: CacheInput): string {
  const normalized = {
    title: input.title.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase(),
    questionTypes: Array.from(new Set(input.questionTypes.map((t) => t.trim().toLowerCase()))).sort(),
    numQuestions: input.numQuestions,
    totalMarks: input.totalMarks,
    instructions: (input.instructions ?? "").trim(),
    sourceText: (input.sourceText ?? "").trim(),
  };
  const hash = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  return `${CACHE_PREFIX}${hash}`;
}

export async function getCachedPaper(key: string): Promise<GeneratedPaper | null> {
  const raw = await redisConnection.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = PaperSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function setCachedPaper(
  key: string,
  paper: GeneratedPaper
): Promise<void> {
  await redisConnection.set(key, JSON.stringify(paper), "EX", CACHE_TTL_SECONDS);
}
