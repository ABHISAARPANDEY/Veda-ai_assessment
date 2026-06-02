import OpenAI from "openai";
import { env } from "./env.js";

// Singleton OpenAI client. Reused across jobs to avoid per-request handshake cost.
// IMPORTANT: set a billing cap in the OpenAI dashboard — the SDK does not enforce one.
export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export const OPENAI_MODEL = env.OPENAI_MODEL;
