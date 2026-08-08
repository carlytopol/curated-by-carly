import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { CreateDailyEventInput, DailyEvent } from "@/types/daily-event";
import { classifyManualEvent } from "@/lib/daily-agenda/manual-events";
import { wardrobeItemLabel } from "@/lib/wardrobe/item-label";
import { resolveServerRecommendationEngine } from "@/lib/recommendations/v2/account-routing.server";

type RecommendationItemRow = {
  position: number;
  clothing_item_id: string;
  clothing_items: { id: string; designer: string | null; item_name: string | null; category: string | null } | null;
};
type RecommendationRow = {
  id: string;
  summary: string;
  rationale: string | null;
  status: string;
  created_at: string;
  recommendation_set_id: string;
  option_index: number;
  recommendation_items?: RecommendationItemRow[] | null;
};
type DailyEventRow = {
  id: string;
  event_date: string;
  starts_at: string | null;
  title: string;
  location: string | null;
  dress_code: string | null;
  notes: string | null;
  position: number;
  outfit_recommendations?: RecommendationRow[] | null;
};

function utcTimestamp(value: string | null) {
  if (!value) return null;
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
}

function dto(event: DailyEventRow): DailyEvent {
  const classification = classifyManualEvent({ title: event.title, location: event.location });
  // Today shows the active edit, not historical worn/selected copy. Active
  // sets are invalidated when any wardrobe garment is deleted.
  const orderedRecommendations = [...(event.outfit_recommendations ?? [])]
    .filter((recommendation) => recommendation.status === "suggested")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const latest = orderedRecommendations[0];
  const recommendationOptions = latest
    ? orderedRecommendations
        .filter((recommendation) => recommendation.recommendation_set_id === latest.recommendation_set_id)
        .sort((a, b) => a.option_index - b.option_index)
        .map((recommendation) => ({
          id: recommendation.id,
          summary: recommendation.summary,
          rationale: recommendation.rationale,
          status: recommendation.status,
          optionIndex: recommendation.option_index,
          wardrobeItems: [...(recommendation.recommendation_items ?? [])]
            .sort((a, b) => a.position - b.position)
            .flatMap((link) => {
              const item = link.clothing_items;
              return item ? [{
                id: item.id,
                label: wardrobeItemLabel(item),
                category: item.category,
              }] : [];
            }),
        }))
    : [];
  return {
    id: event.id,
    eventDate: event.event_date,
    startsAt: utcTimestamp(event.starts_at),
    title: event.title,
    location: event.location,
    dressCode: event.dress_code,
    notes: event.notes,
    position: event.position,
    ...classification,
    recommendationSetId: latest?.recommendation_set_id ?? null,
    recommendationOptions,
    recommendation: recommendationOptions[0] ?? null,
  };
}

export async function listDailyEvents(userId: string, date: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_events")
    .select("id,event_date,starts_at,title,location,dress_code,notes,position,outfit_recommendations(id,summary,rationale,status,created_at,recommendation_set_id,option_index,recommendation_items(position,clothing_item_id,clothing_items(id,designer,item_name,category)))")
    .eq("user_id", userId)
    .eq("event_date", date)
    .order("position", { ascending: true })
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Daily schedule query failed: ${error.message}`);
  const events = ((data ?? []) as DailyEventRow[]).map(dto);
  if (resolveServerRecommendationEngine(userId).engine !== "v2" || !events.length) return events;

  const { data: runs, error: runsError } = await supabase
    .from("recommendation_runs_v2")
    .select("id,daily_event_id,created_at")
    .eq("user_id", userId)
    .in("daily_event_id", events.map((event) => event.id))
    .order("created_at", { ascending: false });
  if (runsError) throw new Error(`V2 recommendation query failed: ${runsError.message}`);
  const latestRunByEvent = new Map<string, { id: string; daily_event_id: string }>();
  for (const run of runs ?? []) if (!latestRunByEvent.has(run.daily_event_id)) latestRunByEvent.set(run.daily_event_id, run);
  const runIds = [...latestRunByEvent.values()].map((run) => run.id);
  if (!runIds.length) return events;

  const { data: options, error: optionsError } = await supabase
    .from("recommendation_options_v2")
    .select("id,run_id,option_index,summary,rationale")
    .eq("user_id", userId)
    .in("run_id", runIds)
    .order("option_index", { ascending: true });
  if (optionsError) throw new Error(`V2 recommendation options query failed: ${optionsError.message}`);
  const optionIds = (options ?? []).map((option) => option.id);
  const itemResult = optionIds.length
    ? await supabase
        .from("recommendation_option_items_v2")
        .select("option_id,item_id,garment_role,position,clothing_items(id,designer,item_name,category)")
        .eq("user_id", userId)
        .in("option_id", optionIds)
        .order("position", { ascending: true })
    : { data: [], error: null };
  if (itemResult.error) throw new Error(`V2 recommendation items query failed: ${itemResult.error.message}`);
  type V2OptionItem = {
    option_id: string;
    item_id: string;
    garment_role: string;
    position: number;
    clothing_items: { id: string; designer: string | null; item_name: string | null; category: string | null } | Array<{ id: string; designer: string | null; item_name: string | null; category: string | null }> | null;
  };
  const itemsByOption = new Map<string, V2OptionItem[]>();
  for (const item of itemResult.data ?? []) {
    const bucket = itemsByOption.get(item.option_id) ?? [];
    bucket.push(item as V2OptionItem);
    itemsByOption.set(item.option_id, bucket);
  }

  for (const event of events) {
    const run = latestRunByEvent.get(event.id);
    if (!run) continue;
    const v2Options = (options ?? []).filter((option) => option.run_id === run.id).map((option) => ({
      id: `${run.id}:${option.option_index}`,
      summary: option.summary,
      rationale: option.rationale,
      status: "suggested",
      optionIndex: option.option_index,
      wardrobeItems: (itemsByOption.get(option.id) ?? []).flatMap((link) => {
        const raw = link.clothing_items;
        const item = Array.isArray(raw) ? raw[0] : raw;
        return item ? [{ id: item.id, label: wardrobeItemLabel(item), category: item.category }] : [];
      }),
    }));
    event.recommendationSetId = run.id;
    event.recommendationOptions = v2Options;
    event.recommendation = v2Options[0] ?? null;
  }
  return events;
}

export async function createDailyEvent(userId: string, input: CreateDailyEventInput) {
  const supabase = await createClient();
  const { count, error: countError } = await supabase.from("daily_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("event_date", input.eventDate);
  if (countError) throw new Error(`Daily schedule count failed: ${countError.message}`);
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("daily_events").insert({
    id: randomUUID(),
    user_id: userId,
    event_date: input.eventDate,
    starts_at: input.startsAt,
    title: input.title.trim(),
    location: input.location?.trim() || null,
    dress_code: input.dressCode?.trim() || null,
    notes: input.notes?.trim() || null,
    position: count ?? 0,
    updated_at: now,
  }).select("id,event_date,starts_at,title,location,dress_code,notes,position").single();
  if (error) throw new Error(`Daily schedule save failed: ${error.message}`);
  return dto(data as DailyEventRow);
}

export async function deleteDailyEvent(userId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("daily_events").delete().eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error) throw new Error(`Daily schedule delete failed: ${error.message}`);
  if (!data) throw new Error("Event not found.");
}

export async function updateDailyEvent(userId: string, id: string, input: Partial<CreateDailyEventInput> & { position?: number }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("daily_events").update({
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.startsAt !== undefined ? { starts_at: input.startsAt || null } : {}),
    ...(input.location !== undefined ? { location: input.location?.trim() || null } : {}),
    ...(input.dressCode !== undefined ? { dress_code: input.dressCode?.trim() || null } : {}),
    ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
    ...(input.position !== undefined ? { position: input.position } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error) throw new Error(`Daily schedule update failed: ${error.message}`);
  if (!data) throw new Error("Event not found.");
}
