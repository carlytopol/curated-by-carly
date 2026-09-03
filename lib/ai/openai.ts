import "server-only";
import OpenAI from "openai";
import { AIConfigurationError } from "@/lib/ai/errors";

let client: OpenAI | null = null;

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new AIConfigurationError();
  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60_000,
    maxRetries: 1,
  });
  return client;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";
