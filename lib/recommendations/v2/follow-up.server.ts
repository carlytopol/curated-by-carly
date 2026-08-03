import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RECOMMENDATION_AUTHORITY_VERSION } from "./authority";
import {
  CUSTOMER_MEMORY_COMMAND_VERSION,
  executeCustomerMemoryCommand,
  type CustomerMemoryCommand,
  type CustomerMemoryScope,
} from "./customer-memory";
import { SupabaseCustomerMemoryRepository } from "./customer-memory-repository";
import {
  requestsRecommendationRestoration,
  requestsRecommendationSuppression,
} from "./follow-up-intent";

const V2_OPTION_ID = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):(\d+)$/i;

type RunRow = { id: string; daily_event_id: string };
type EventRow = { id: string; event_date: string };
type OptionRow = { id: string };
type ItemRow = {
  item_id: string;
  clothing_items:
    | { id: string; designer: string | null; item_name: string | null }
    | Array<{ id: string; designer: string | null; item_name: string | null }>
    | null;
};

export function parseV2RecommendationOptionId(value: string) {
  const match = V2_OPTION_ID.exec(value);
  if (!match) return null;
  return { runId: match[1], optionIndex: Number(match[2]) };
}

function normalized(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

function itemLabel(row: ItemRow) {
  const relation = Array.isArray(row.clothing_items) ? row.clothing_items[0] : row.clothing_items;
  return [relation?.designer, relation?.item_name].filter(Boolean).join(" ").trim();
}

function bestMentionedItem(question: string, items: ItemRow[]) {
  const query = normalized(question);
  return items
    .map((row) => {
      const label = normalized(itemLabel(row));
      const tokens = label.split(" ").filter((token) => token.length > 2);
      const matched = tokens.filter((token) => query.includes(token)).length;
      return { row, label, matched, exact: Boolean(label && query.includes(label)) };
    })
    .filter((candidate) => candidate.exact || candidate.matched >= 2)
    .sort((left, right) => Number(right.exact) - Number(left.exact) || right.matched - left.matched)[0]?.row ?? null;
}

function authorization(userId: string, runId: string, question: string) {
  const digest = createHash("sha256").update(`${runId}:${question.trim()}`).digest("hex").slice(0, 32);
  return {
    authorityVersion: RECOMMENDATION_AUTHORITY_VERSION,
    targetUserId: userId,
    actor: { kind: "customer" as const, actorUserId: userId },
    idempotencyKey: `v2-follow-up:${digest}`,
    requestedAt: new Date().toISOString(),
  };
}

export async function handleMainAppV2FollowUp(input: {
  client: SupabaseClient;
  userId: string;
  recommendationId: string;
  question: string;
  hasPhoto: boolean;
}) {
  const parsed = parseV2RecommendationOptionId(input.recommendationId);
  if (!parsed) return null;
  if (input.hasPhoto) {
    return { status: 422, body: { error: "Fit-check photos are not yet available in this V2 consultation. Your question has been kept.", code: "v2_fit_check_unavailable" } };
  }

  const { data: run, error: runError } = await input.client.from("recommendation_runs_v2")
    .select("id,daily_event_id").eq("id", parsed.runId).eq("user_id", input.userId).maybeSingle<RunRow>();
  if (runError) throw runError;
  if (!run) return { status: 404, body: { error: "Recommendation not found." } };
  const [{ data: event, error: eventError }, { data: option, error: optionError }] = await Promise.all([
    input.client.from("daily_events").select("id,event_date").eq("id", run.daily_event_id).eq("user_id", input.userId).maybeSingle<EventRow>(),
    input.client.from("recommendation_options_v2").select("id").eq("run_id", run.id).eq("user_id", input.userId).eq("option_index", parsed.optionIndex).maybeSingle<OptionRow>(),
  ]);
  if (eventError) throw eventError;
  if (optionError) throw optionError;
  if (!event || !option) return { status: 404, body: { error: "Recommendation not found." } };

  const { data: itemRows, error: itemError } = await input.client.from("recommendation_option_items_v2")
    .select("item_id,clothing_items(id,designer,item_name)")
    .eq("option_id", option.id).eq("user_id", input.userId);
  if (itemError) throw itemError;
  const items = (itemRows ?? []) as ItemRow[];
  const repository = new SupabaseCustomerMemoryRepository(input.client, input.userId);
  const auth = authorization(input.userId, run.id, input.question);
  let command: CustomerMemoryCommand;

  if (requestsRecommendationRestoration(input.question)) {
    const { data: activeRows, error: activeError } = await input.client.from("recommendation_suppressions_v2")
      .select("id,item_id,clothing_items(id,designer,item_name)")
      .eq("user_id", input.userId).eq("status", "active");
    if (activeError) throw activeError;
    const selected = bestMentionedItem(input.question, (activeRows ?? []) as ItemRow[]);
    const record = (activeRows ?? []).find((row) => row.item_id === selected?.item_id);
    if (!record) {
      return { status: 422, body: { error: "Tell Curated which suppressed wardrobe item you would like to restore. Your message has been kept.", code: "suppression_item_unclear" } };
    }
    command = { commandVersion: CUSTOMER_MEMORY_COMMAND_VERSION, kind: "restore-suppression", authorization: auth, recordId: record.id };
  } else if (requestsRecommendationSuppression(input.question)) {
    const selected = bestMentionedItem(input.question, items);
    if (!selected) {
      return { status: 422, body: { error: "Tell Curated which piece in this look should leave recommendation rotation. Your message has been kept.", code: "suppression_item_unclear" } };
    }
    command = {
      commandVersion: CUSTOMER_MEMORY_COMMAND_VERSION,
      kind: "create-suppression",
      authorization: auth,
      scope: { kind: "until-restored" },
      originalLanguage: input.question,
      itemId: selected.item_id,
    };
  } else {
    const scope: CustomerMemoryScope = {
      kind: "today-only",
      localDate: event.event_date,
      timezone: "America/New_York",
      timezoneBehavior: "fixed-at-creation",
      dailyEventId: event.id,
    };
    command = {
      commandVersion: CUSTOMER_MEMORY_COMMAND_VERSION,
      kind: "create-correction",
      authorization: auth,
      scope,
      originalLanguage: input.question,
      directive: { kind: "current-intention", intention: input.question },
    };
  }

  const result = await executeCustomerMemoryCommand(repository, command);
  if (!result.success) {
    return { status: result.retryable ? 503 : 422, body: { error: result.reason, code: "v2_memory_not_saved" } };
  }
  return {
    status: 200,
    body: {
      answer: `${result.customerMessage} ${result.rememberedMessage}`,
      fitCheckSaved: false,
      pairPreferenceSaved: false,
      eventCorrectionSaved: true,
      shouldRegenerate: true,
      engineVersion: "recommendation-engine.v2.1.0",
      memoryRecordId: result.mutation.recordId,
    },
  };
}
