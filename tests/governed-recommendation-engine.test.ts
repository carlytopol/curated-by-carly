import assert from "node:assert/strict";
import test from "node:test";
import { buildContextEvidence } from "@/lib/recommendations/engine/context-evidence";
import {
  classifyWardrobeRole,
  generateGovernedRecommendations,
  traceOutfitValidation,
} from "@/lib/recommendations/engine/governed-engine";
import { auditItemEligibility, buildEventPolicy } from "@/lib/recommendations/engine/event-policy";
import { resolveExplicitlyRequestedItemIds } from "@/lib/recommendations/engine/explicit-item-request";
import { researchVenue } from "@/lib/recommendations/engine/venue-research";
import type { EngineWardrobeItem, VenueRule } from "@/lib/recommendations/engine/types";
import {
  buildWardrobeEvidenceSummary,
  interpretPersonalStyle,
  PERSONAL_STYLING_BRIEF_VERSION,
  resolveStyleProfile,
  withProfileNotes,
  type StylePreference,
  type StyleProfileSnapshot,
} from "@/lib/recommendations/engine/style-profile";
import { classifyOccasion, inferDressCode } from "@/lib/daily-agenda/classify";
import type { DailyAgendaItem } from "@/types/daily-agenda";

let id = 0;
function item(category: string, name: string, extras: Partial<EngineWardrobeItem> = {}): EngineWardrobeItem {
  id += 1;
  return {
    id: `item-${id}`, category, item_name: name, color: "Black",
    availability_status: "available", rotationScore: 75, ...extras,
  };
}

function agenda(title: string, location = "Atlanta"): DailyAgendaItem {
  const raw = { title, location, isAllDay: false };
  const occasionClassification = classifyOccasion(raw);
  return {
    id: "agenda-1", source: "manual", title, location,
    startTime: "2026-07-27T18:00:00-04:00", endTime: "2026-07-27T21:00:00-04:00",
    isAllDay: false, occasionClassification,
    dressCodeInference: inferDressCode(raw, occasionClassification),
    provider: null, calendarName: null, isReadOnly: false, userCorrection: null,
    hasTimeConflict: false, overlapsWithItemIds: [],
  };
}

function context(input: {
  title?: string; location?: string; notes?: string; dressCode?: string;
  high?: number; rain?: number; venueRules?: VenueRule[];
}) {
  return buildContextEvidence({
    agendaItem: agenda(input.title ?? "Dinner", input.location),
    notes: input.notes,
    statedDressCode: input.dressCode,
    venueRules: input.venueRules,
    weather: {
      current: { temperature_2m: input.high, apparent_temperature: input.high, precipitation_probability: input.rain },
      daily: { temperature_2m_max: [input.high] },
    },
  });
}

function summerWardrobe() {
  return [
    item("Tops", "Solid linen tank top", { color: "White" }),
    item("Tops", "Solid cotton short sleeve blouse", { color: "Navy" }),
    item("Tops", "Solid silk shell top", { color: "Ivory" }),
    item("Tops", "Casual cotton short sleeve top", { color: "Green" }),
    item("Tops", "Casual linen tee", { color: "Pink" }),
    item("Shorts", "Tailored shorts with pockets", { color: "Khaki" }),
    item("Shorts", "Casual cotton shorts with pockets", { color: "Navy" }),
    item("Pants", "Lightweight trousers with pockets", { color: "Black" }),
    item("Skirts", "Casual cotton midi skirt with pockets", { color: "Blue" }),
    item("Shoes", "Supportive leather sneakers"),
    item("Shoes", "Comfortable flat sandals"),
    item("Shoes", "Walkable loafers"),
    item("Perfumes / Fragrances", "Citrus perfume"),
    item("Perfumes / Fragrances", "Gardenia perfume"),
  ];
}

function profile(
  userId: string,
  preferences: Array<Partial<StylePreference> & Pick<StylePreference, "id" | "dimension" | "value">>,
): StyleProfileSnapshot {
  return {
    userId,
    version: `profile-${userId}`,
    status: preferences.length ? "active" : "empty",
    updatedAt: "2026-07-28T18:00:00.000Z",
    preferences: preferences.map((preference) => ({
      subject: preference.id,
      questionId: null,
      polarity: "prefer",
      rank: null,
      garmentRoles: [],
      occasions: [],
      scope: {},
      provenance: "survey",
      authority: "explicit-confirmed",
      confidence: "high",
      recordedAt: "2026-07-28T18:00:00.000Z",
      ...preference,
    })),
  };
}

test("Style Profiles are neutral when absent and isolated to the authenticated user", () => {
  assert.equal(resolveStyleProfile(undefined).status, "not-provided");
  const userProfile = profile("user-a", [{
      id: "preference-1",
      dimension: "aesthetic",
      value: "polished social dressing",
      occasions: ["social"],
    }]);
  assert.equal(resolveStyleProfile(userProfile, "user-a").preferences.length, 1);
  assert.throws(() => resolveStyleProfile(userProfile, "user-b"), /ownership/);
});

test("supplying no Style Profile leaves recommendation behavior neutral", () => {
  const result = generateGovernedRecommendations({
    wardrobe: summerWardrobe(),
    context: context({ title: "Dinner", high: 74 }),
  });
  assert.equal(result.styleProfile.status, "not-provided");
  assert.equal(result.styleProfile.preferences.length, 0);
});

test("confirmed free-form Profile notes guide initial outfit eligibility and ranking", () => {
  const base = profile("user-profile-notes", []);
  const enriched = withProfileNotes(base, "user-profile-notes", {
    styleNotes: "I don't want tank tops. I prefer tailored, polished clothes.",
    fitNotes: "I like a defined waist.",
    proportions: "Long torso.",
    updatedAt: "2026-08-09T12:00:00.000Z",
  });
  const tank = item("Tops", "Ribbed scoop-neck tank top");
  const result = generateGovernedRecommendations({
    userId: "user-profile-notes",
    styleProfile: enriched,
    wardrobe: [
      tank,
      item("Tops", "Tailored cotton short-sleeve blouse"),
      item("Shorts", "Tailored cotton shorts"),
      item("Shoes", "Leather ballet flats"),
    ],
    context: context({ title: "Late lunch with friends", high: 88 }),
  });
  assert.ok(enriched.preferences.some((entry) => entry.value === "tank" && entry.polarity === "avoid"));
  assert.ok(enriched.preferences.some((entry) => entry.value === "tailored" && entry.polarity === "prefer"));
  assert.ok(result.options.every((option) => !option.itemIds.includes(tank.id)));
});

test("school volunteering establishes an approachable practical posture before garments are considered", () => {
  const evidence = context({
    title: "Volunteering at my children's school and touring potential parents",
    notes: "I will be in the classroom. Comfortable shoes for walking.",
    high: 84,
  });
  assert.equal(evidence.agendaItem.occasionClassification.reasonCode, "school_community_keyword");
  assert.equal(evidence.agendaItem.dressCodeInference.dressCode, "approachable polished casual");
  assert.equal(evidence.dressingPosture.archetype, "everyday-casual-social");
  assert.equal(evidence.dressingPosture.requestedPolish, "polished-casual");
  assert.equal(evidence.dressingPosture.formalityCeiling, 3);
  const policy = buildEventPolicy(evidence);
  assert.equal(policy.archetype, "school-community-day");
  assert.ok(policy.hardConstraints.includes("reject-school-formal-footwear"));

  const dress = auditItemEligibility(
    item("Dresses", "Black lace short-sleeve mini shift dress"),
    evidence,
    policy,
  );
  const pumps = auditItemEligibility(
    item("Shoes", "Black fabric pumps with ivory rosette toe embellishments"),
    evidence,
    policy,
  );
  const walkingShoe = auditItemEligibility(
    item("Shoes", "Comfortable polished leather walking loafers"),
    evidence,
    policy,
  );
  assert.equal(dress.eligible, false);
  assert.ok(dress.rejectionReasons.includes("school-occasionwear"));
  assert.equal(pumps.eligible, false);
  assert.ok(pumps.rejectionReasons.includes("school-formal-footwear"));
  assert.equal(walkingShoe.eligible, true);

  const governed = generateGovernedRecommendations({
    wardrobe: [
      item("Dresses", "Black lace short-sleeve mini shift dress", { id: "school-lace-mini" }),
      item("Tops", "Polished cotton short-sleeve blouse", { id: "school-blouse", color: "Ivory" }),
      item("Pants", "Lightweight ankle trousers", { id: "school-trousers", color: "Navy" }),
      item("Shoes", "Comfortable polished leather walking loafers", { id: "school-loafers" }),
      item("Perfumes / Fragrances", "Soft gardenia perfume", { id: "school-fragrance" }),
    ],
    context: evidence,
  });
  assert.ok(governed.options.length > 0);
  assert.ok(governed.options.every((option) => !option.itemIds.includes("school-lace-mini")));
  assert.ok(governed.options.every((option) =>
    option.itemIds.includes("school-blouse") &&
    option.itemIds.includes("school-trousers") &&
    option.itemIds.includes("school-loafers")
  ));
});

test("Wardrobe Evidence remains separate, user-owned, and fully provenance-bearing", () => {
  const wardrobe = [
    item("Dresses", "Printed cotton midi dress", { id: "printed-dress", color: "Blue" }),
    item("Shoes", "Leather loafers", { id: "loafers", color: "Brown" }),
    item("Tops", "Graphic tee", { id: "graphic-tee", color: "White" }),
  ];
  const resolved = resolveStyleProfile(profile("evidence-user", [{
    id: "prefer-blue", dimension: "color", value: "blue",
  }]), "evidence-user");
  const evidence = buildWardrobeEvidenceSummary({
    userId: "evidence-user",
    wardrobe,
    wornOutfits: [
      { id: "worn-1", itemIds: ["printed-dress", "loafers"], occasion: "Dinner", wornAt: "2026-07-01" },
      { id: "worn-2", itemIds: ["printed-dress", "loafers"], occasion: "Dinner", wornAt: "2026-07-08" },
      { id: "worn-3", itemIds: ["printed-dress", "loafers"], occasion: "Dinner", wornAt: "2026-07-15" },
    ],
  }, resolved);
  assert.equal(evidence.ownerUserId, "evidence-user");
  assert.ok(evidence.recurringColorFamilies.length > 0);
  assert.ok(evidence.frequentlyWornCombinations.some((entry) => entry.confidence === "high"));
  for (const group of Object.values(evidence)) {
    if (!Array.isArray(group)) continue;
    for (const inference of group) {
      assert.equal(inference.advisoryOnly, true);
      assert.ok(inference.provenance.length > 0);
      assert.ok(inference.provenance.every((entry: { source: string; observationCount: number }) =>
        Boolean(entry.source) && entry.observationCount > 0
      ));
    }
  }
  assert.throws(() => buildWardrobeEvidenceSummary({
    userId: "different-user", wardrobe,
  }, resolved), /ownership/);
});

test("behavior broadens a broad print avoidance without overwriting the explicit answer", () => {
  const wardrobe = [
    item("Dresses", "Printed cotton midi dress", { id: "print-one", color: "Blue" }),
    item("Shoes", "Leather loafers", { id: "shoe-one" }),
  ];
  const resolved = resolveStyleProfile(profile("selective-print-user", [{
    id: "avoid-prints", dimension: "pattern", value: "patterns", polarity: "avoid",
  }]), "selective-print-user");
  const evidence = buildWardrobeEvidenceSummary({
    userId: "selective-print-user",
    wardrobe,
    wornOutfits: [
      { id: "look-1", itemIds: ["print-one", "shoe-one"], occasion: "Dinner", wornAt: "2026-07-01" },
      { id: "look-2", itemIds: ["print-one", "shoe-one"], occasion: "Dinner", wornAt: "2026-07-08" },
      { id: "look-3", itemIds: ["print-one", "shoe-one"], occasion: "Dinner", wornAt: "2026-07-15" },
    ],
  }, resolved);
  const brief = interpretPersonalStyle(resolved, context({ title: "Dinner", high: 75 }), evidence);
  const explicit = brief.directives.find((entry) => entry.sourcePreferenceIds.includes("avoid-prints"));
  assert.equal(explicit?.vetoEligible, true);
  assert.equal(brief.reconciliation.conflicts[0]?.resolution, "ask-focused-question");
  assert.match(brief.reconciliation.focusedQuestion ?? "", /particular prints or occasions/i);
});

test("high-confidence occasion behavior guides but never vetoes or globalizes a graphic tee", () => {
  const wardrobe = [
    item("Tops", "Graphic tee", { id: "tee" }),
    item("Shorts", "Cotton shorts", { id: "shorts" }),
  ];
  const resolved = resolveStyleProfile(profile("occasion-user", []), "occasion-user");
  const evidence = buildWardrobeEvidenceSummary({
    userId: "occasion-user",
    wardrobe,
    wornOutfits: [
      { id: "errand-1", itemIds: ["tee", "shorts"], occasion: "Errands", wornAt: "2026-07-01" },
      { id: "errand-2", itemIds: ["tee", "shorts"], occasion: "Errands", wornAt: "2026-07-08" },
      { id: "errand-3", itemIds: ["tee", "shorts"], occasion: "Errands", wornAt: "2026-07-15" },
    ],
  }, resolved);
  const brief = interpretPersonalStyle(resolved, context({ title: "Concert", high: 80 }), evidence);
  const graphicDirective = brief.directives.find((entry) => entry.value === "graphic-tee");
  assert.equal(graphicDirective?.kind, "reserve");
  assert.deepEqual(graphicDirective?.occasions, ["errands"]);
  assert.equal(graphicDirective?.vetoEligible, false);
});

test("low-confidence behavioral evidence cannot create hard exclusions", () => {
  const wardrobe = summerWardrobe();
  const result = generateGovernedRecommendations({
    wardrobe,
    context: context({ title: "Lunch", high: 76 }),
    userId: "learning-user",
    styleProfile: profile("learning-user", []),
    styleEvidence: {
      behavioralSignals: [{
        id: "weak-signal", subject: "avoid-item", value: "not sure",
        context: { itemId: wardrobe[0].id, occasion: "lunch" },
        strength: "low", sourceRecordType: "recommendation", sourceRecordId: null,
      }],
    },
  });
  assert.ok(result.stylingBrief.directives.every((entry) =>
    entry.provenance !== "behavioral-signal" || entry.vetoEligible === false
  ));
});

test("two users with identical wardrobes receive independently styled recommendations", () => {
  const wardrobe = [
    item("Tops", "Ivory polished shell", { color: "Ivory" }),
    item("Tops", "Navy polished shell", { color: "Navy" }),
    item("Shorts", "Tailored shorts with pockets", { color: "Black", analysis_metadata: { hasPockets: true } }),
    item("Shorts", "Utility shorts with pockets", { color: "Khaki", analysis_metadata: { hasPockets: true } }),
    item("Shoes", "Walkable leather loafers"),
    item("Shoes", "Polished walking sandals"),
  ];
  const makeProfile = (userId: string, color: string) => profile(userId, [{
      id: `color-${color}`,
      dimension: "color",
      value: color,
    }]);
  const evidence = context({ title: "Casual dinner", high: 76 });
  const ivory = generateGovernedRecommendations({
    wardrobe, context: evidence, userId: "user-ivory", styleProfile: makeProfile("user-ivory", "ivory"), optionCount: 1,
  });
  const navy = generateGovernedRecommendations({
    wardrobe, context: evidence, userId: "user-navy", styleProfile: makeProfile("user-navy", "navy"), optionCount: 1,
  });
  assert.ok(ivory.options[0].itemIds.includes(wardrobe[0].id));
  assert.ok(navy.options[0].itemIds.includes(wardrobe[1].id));
  assert.notDeepEqual(ivory.options[0].itemIds, navy.options[0].itemIds);
});

test("polished casual remains distinct from casual and polished", () => {
  const wardrobe = [
    item("Tops", "Casual cotton tee"),
    item("Tops", "Considered cotton blouse"),
    item("Tops", "Formal silk blouse"),
    item("Shorts", "Casual utility shorts with pockets", { analysis_metadata: { hasPockets: true } }),
    item("Pants", "Tailored trousers with pockets", { analysis_metadata: { hasPockets: true } }),
    item("Shoes", "Comfortable flat sandals"),
    item("Shoes", "Polished leather loafers"),
  ];
  const casual = generateGovernedRecommendations({
    wardrobe, context: context({ title: "Casual social plans", notes: "Keep it casual", high: 76 }),
    userId: "casual", styleProfile: profile("casual", []), optionCount: 1,
  });
  const considered = generateGovernedRecommendations({
    wardrobe, context: context({ title: "Social plans", notes: "Make it polished casual", high: 76 }),
    userId: "considered", styleProfile: profile("considered", []), optionCount: 1,
  });
  const polished = generateGovernedRecommendations({
    wardrobe, context: context({ title: "Social plans", notes: "Make it polished", high: 76 }),
    userId: "polished", styleProfile: profile("polished", []), optionCount: 1,
  });
  assert.equal(casual.stylingBrief.desiredPolish, "casual");
  assert.equal(considered.stylingBrief.desiredPolish, "polished-casual");
  assert.equal(polished.stylingBrief.desiredPolish, "polished");
});

test("occasion-reserved casual basics are used for errands and excluded from polished social plans", () => {
  const reservedTee = item("Tops", "Graphic cotton tee");
  const wardrobe = [
    reservedTee, item("Tops", "Polished sleeveless blouse"),
    item("Shorts", "Tailored shorts with pockets"), item("Shoes", "Walkable leather loafers"),
  ];
  const reservation = profile("reserved-user", [{
    id: "reserve-casual-basics",
    dimension: "garment-role",
    value: "reserved",
    polarity: "required",
    garmentRoles: ["casual-basics"],
    occasions: ["errands"],
  }]);
  const errands = generateGovernedRecommendations({
    wardrobe, context: context({ title: "Errands", high: 78 }),
    userId: "reserved-user", styleProfile: reservation, optionCount: 1,
  });
  const social = generateGovernedRecommendations({
    wardrobe, context: context({ title: "Social concert", notes: "Polished casual", high: 78 }),
    userId: "reserved-user", styleProfile: reservation, optionCount: 1,
  });
  assert.ok(errands.options.some((option) => option.itemIds.includes(reservedTee.id)));
  assert.ok(social.options.every((option) => !option.itemIds.includes(reservedTee.id)));
});

test("preferred combinations alter whole-outfit generation rather than individual item totals", () => {
  const relaxedTop = item("Tops", "Casual cotton top");
  const polishedTop = item("Tops", "Tailored polished blouse");
  const wardrobe = [
    relaxedTop, polishedTop, item("Shorts", "Tailored shorts with pockets"),
    item("Shoes", "Polished leather loafers"), item("Shoes", "Easy flat sandals"),
  ];
  const relaxedFoundation = profile("relationship-a", [{
    id: "relationship-a", dimension: "combination", value: "more_likely_a",
  }]);
  const elevatedFoundation = profile("relationship-b", [{
    id: "relationship-b", dimension: "combination", value: "more_likely_b",
  }]);
  const a = generateGovernedRecommendations({
    wardrobe, context: context({ title: "Social plans", high: 75 }),
    userId: "relationship-a", styleProfile: relaxedFoundation, optionCount: 1,
  });
  const b = generateGovernedRecommendations({
    wardrobe, context: context({ title: "Social plans", high: 75 }),
    userId: "relationship-b", styleProfile: elevatedFoundation, optionCount: 1,
  });
  assert.notDeepEqual(a.options[0].itemIds, b.options[0].itemIds);
});

test("Event Policy overrides an incompatible Style Profile direction", () => {
  const boots = item("Shoes", "Favorite suede mid-calf boots");
  const result = generateGovernedRecommendations({
    wardrobe: [...summerWardrobe(), boots],
    context: context({ title: "Outdoor stadium concert", location: "Truist Park", high: 94 }),
    userId: "boots-user",
    styleProfile: profile("boots-user", [{ id: "prefer-boots", dimension: "footwear", value: "boots" }]),
  });
  assert.ok(result.options.length);
  assert.ok(result.options.every((option) => !option.itemIds.includes(boots.id)));
});

test("current explicit intent overrides Profile defaults", () => {
  const result = generateGovernedRecommendations({
    wardrobe: summerWardrobe(),
    context: context({ title: "Social plans", notes: "For today, make it casual", high: 76 }),
    userId: "polish-user",
    styleProfile: profile("polish-user", [{
      id: "default-polish", dimension: "polish", value: "polished", occasions: ["social"],
    }]),
  });
  assert.equal(result.stylingBrief.desiredPolish, "casual");
});

test("a current garment instruction overrides an occasion reservation", () => {
  const graphicTee = item("Tops", "Roland Garros graphic tee");
  const result = generateGovernedRecommendations({
    wardrobe: [
      graphicTee,
      item("Shorts", "Tailored shorts with pockets"),
      item("Shoes", "Polished walking sneakers"),
    ],
    context: context({
      title: "Social plans",
      notes: "Wear the Roland Garros graphic tee today and keep the look polished casual.",
      high: 76,
    }),
    userId: "reservation-user",
    styleProfile: profile("reservation-user", [{
      id: "reserve-graphic-tees",
      dimension: "garment-role",
      value: "reserved",
      polarity: "required",
      garmentRoles: ["casual-basics"],
      occasions: ["errands", "travel"],
    }]),
    optionCount: 1,
  });

  assert.match(result.stylingBrief.explicitCurrentInstructions.join(" "), /graphic tee/i);
  assert.ok(result.options[0]?.itemIds.includes(graphicTee.id));
});

test("an absent or incomplete Style Profile produces neutral behavior", () => {
  const wardrobe = summerWardrobe();
  const absent = generateGovernedRecommendations({ wardrobe, context: context({ title: "Lunch", high: 76 }) });
  const empty = generateGovernedRecommendations({
    wardrobe, context: context({ title: "Lunch", high: 76 }),
    userId: "empty-user", styleProfile: profile("empty-user", []),
  });
  assert.equal(absent.stylingBrief.neutral, true);
  assert.equal(empty.stylingBrief.neutral, true);
  assert.deepEqual(absent.options.map((option) => option.itemIds), empty.options.map((option) => option.itemIds));
});

test("low-confidence inferred avoidances can guide but never veto", () => {
  const navy = item("Tops", "Navy cotton blouse", { color: "Navy" });
  const result = generateGovernedRecommendations({
    wardrobe: [navy, item("Shorts", "Tailored shorts with pockets"), item("Shoes", "Leather loafers")],
    context: context({ title: "Lunch", high: 76 }),
    userId: "inferred-user",
    styleProfile: profile("inferred-user", [{
      id: "inferred-navy", dimension: "color", value: "navy", polarity: "avoid",
      provenance: "inferred", authority: "inferred-low", confidence: "low",
    }]),
  });
  assert.ok(result.options.length);
  assert.ok(result.options[0].itemIds.includes(navy.id));
});

test("Cohesion Scoring and Editorial Review receive the same brief version", () => {
  const result = generateGovernedRecommendations({
    wardrobe: summerWardrobe(), context: context({ title: "Social dinner", high: 76 }),
    userId: "version-user",
    styleProfile: profile("version-user", [{ id: "polished", dimension: "aesthetic", value: "polished" }]),
  });
  assert.equal(result.stylingBrief.schemaVersion, PERSONAL_STYLING_BRIEF_VERSION);
  assert.ok(result.options.every((option) =>
    option.personalStyle.briefVersion === result.stylingBrief.schemaVersion &&
    option.stylingBriefVersion === result.stylingBrief.schemaVersion
  ));
});

test("formal venue honors an explicit dress code", () => {
  const wardrobe = [
    item("Dresses", "Silk cocktail midi dress"),
    item("Dresses", "Formal crepe column dress"),
    item("Dresses", "Cocktail wrap dress"),
    item("Shoes", "Elegant low heel pumps"),
    item("Shoes", "Formal slingback flats"),
  ];
  const result = generateGovernedRecommendations({ wardrobe, context: context({ title: "Museum gala", dressCode: "formal", high: 72 }) });
  assert.ok(result.options.length);
  assert.ok(result.options.every((option) => option.assessment.valid));
});

test("verified venue bag restriction excludes bags and respects pockets", () => {
  const venueRules: VenueRule[] = [{
    kind: "bag-policy", statement: "No bags", effect: "no-bag",
    sourceUrl: "https://www.mlb.com/braves/ballpark/bag-policy",
    retrievedAt: new Date().toISOString(), confidence: "high",
  }];
  const wardrobe = [...summerWardrobe(), item("Handbags", "Large tote bag")];
  const result = generateGovernedRecommendations({
    wardrobe,
    context: context({ title: "Outdoor stadium concert", location: "Truist Park", notes: "I need pockets", high: 90, venueRules }),
  });
  assert.ok(result.options.length);
  assert.ok(result.options.every((option) => !option.itemIds.includes(wardrobe.at(-1)!.id)));
});

test("outdoor dinner with changing weather rejects heavy layers in heat", () => {
  const heavy = item("Sweaters / Knits", "Cable knit wool sweater");
  const result = generateGovernedRecommendations({
    wardrobe: [...summerWardrobe(), heavy],
    context: context({ title: "Outdoor patio dinner", high: 88 }),
  });
  assert.ok(result.options.length);
  assert.ok(result.options.every((option) => !option.itemIds.includes(heavy.id)));
});

test("business meeting followed by dinner produces polished complete looks", () => {
  const result = generateGovernedRecommendations({
    wardrobe: summerWardrobe(),
    context: context({ title: "Client meeting and dinner", dressCode: "business casual", high: 78 }),
  });
  assert.ok(result.options.length);
  assert.ok(result.options.every((option) => option.assessment.factorScores.completeness === 100));
});

test("walking-heavy day rejects unwalkable shoes", () => {
  const heel = item("Shoes", "Delicate stiletto high heel");
  const wardrobe = [...summerWardrobe(), heel];
  const result = generateGovernedRecommendations({
    wardrobe,
    context: context({ title: "All day walking and sightseeing", high: 80 }),
  });
  assert.ok(result.options.length);
  assert.ok(result.options.every((option) => !option.itemIds.includes(heel.id)));
});

test("rain rejects rain-sensitive footwear", () => {
  const suede = item("Shoes", "Suede open toe sandals");
  const result = generateGovernedRecommendations({
    wardrobe: [...summerWardrobe(), suede],
    context: context({ title: "Lunch", high: 70, rain: 80 }),
  });
  assert.ok(result.options.every((option) => !option.itemIds.includes(suede.id)));
});

test("incomplete metadata lowers confidence instead of inventing facts", () => {
  const sparse = [
    item("Tops", "Top", { color: null }), item("Pants", "Pants", { color: null }),
    item("Shoes", "Shoes", { color: null }),
  ];
  const result = generateGovernedRecommendations({ wardrobe: sparse, context: context({ title: "Appointment" }) });
  assert.equal(result.confidence, "low");
});

test("explicit user note overrides an inferred venue assumption", () => {
  const evidence = context({ title: "Indoor concert", notes: "This is outdoors and I cannot carry a bag", high: 85 });
  assert.equal(evidence.bagAllowed.value, false);
  assert.equal(evidence.bagAllowed.provenance, "user");
});

test("unavailable and recently worn hard-excluded items never appear", () => {
  const unavailable = item("Tops", "Favorite silk top", { availability_status: "dirty", favorite: true, rotationScore: 100 });
  const result = generateGovernedRecommendations({
    wardrobe: [...summerWardrobe(), unavailable],
    context: context({ title: "Lunch", high: 78 }),
  });
  assert.ok(result.options.every((option) => !option.itemIds.includes(unavailable.id)));
});

test("favorites do not dominate selection over whole-look validity", () => {
  const favorite = item("Tops", "Favorite heavy wool hoodie", { favorite: true, rotationScore: 100 });
  const result = generateGovernedRecommendations({
    wardrobe: [...summerWardrobe(), favorite],
    context: context({ title: "Outdoor lunch", high: 92 }),
  });
  assert.ok(result.options.every((option) => !option.itemIds.includes(favorite.id)));
});

test("individually attractive pieces are rejected when formality conflicts", () => {
  const tank = item("Tops", "Casual ribbed tank top");
  const skirt = item("Skirts", "Highly formal sequined satin skirt");
  const result = generateGovernedRecommendations({
    wardrobe: [tank, skirt, item("Shoes", "Supportive sneakers")],
    context: context({ title: "Casual concert", high: 90 }),
  });
  assert.equal(result.options.length, 0);
});

test("an occasion lace skirt is rejected for an everyday casual-social plan", () => {
  const skirt = item("Skirts", "Asymmetrical lace-trim skirt");
  const result = generateGovernedRecommendations({
    wardrobe: [
      item("Tops", "Black one-shoulder tank top"),
      skirt,
      item("Shorts", "Casual cotton shorts"),
      item("Shoes", "Leather ballet flats"),
    ],
    context: context({ title: "Late lunch and visiting friends", notes: "Comfortable but put together", high: 90 }),
  });
  const audit = result.eligibilityAudit.find((entry) => entry.itemId === skirt.id);
  assert.ok(audit?.rejectionReasons.includes("everyday-occasionwear"));
  assert.ok(result.options.every((option) => !option.itemIds.includes(skirt.id)));
});

test("fresh foundations displace recently repeated bottoms when alternatives qualify", () => {
  const repeated = item("Pants", "Olive green utility pants", { rotationScore: 20 });
  const result = generateGovernedRecommendations({
    wardrobe: [
      item("Tops", "Fresh cotton shell", { rotationScore: 90 }),
      repeated,
      item("Shorts", "Fresh tailored cotton shorts", { rotationScore: 95 }),
      item("Skirts", "Fresh casual poplin skirt", { rotationScore: 92 }),
      item("Shoes", "Leather ballet flats", { rotationScore: 70 }),
    ],
    context: context({ title: "Late lunch and visiting friends", notes: "Comfortable but put together", high: 90 }),
    optionCount: 2,
  });
  assert.ok(result.options.length >= 1);
  assert.ok(result.options.every((option) => !option.itemIds.includes(repeated.id)));
});

test("recently repeated scoop-neck tops do not lead when fresh complete directions qualify", () => {
  const recent = new Date().toISOString();
  const repeatedTank = item("Tops", "GAP black scoop-neck tank top", {
    rotationScore: 100,
    lastRecommendedAt: recent,
  });
  const result = generateGovernedRecommendations({
    wardrobe: [
      repeatedTank,
      item("Tops", "Tailored silk short-sleeve blouse", { rotationScore: 70 }),
      item("Tops", "Tailored cotton wrap top", { rotationScore: 68 }),
      item("Dresses", "Tailored cotton day dress", { rotationScore: 72 }),
      item("Skirts", "Tailored cotton midi skirt", { rotationScore: 70 }),
      item("Pants", "Lightweight tailored trousers", { rotationScore: 70 }),
      item("Shoes", "Leather block-heel sandals"),
      item("Shoes", "Kitten heel pumps"),
    ],
    context: context({ title: "Dinner with friends", notes: "I want to be dressy but not formal and wear heels", high: 82 }),
    optionCount: 2,
  });
  assert.equal(result.options.length, 2);
  assert.ok(result.options.every((option) => !option.itemIds.includes(repeatedTank.id)));
});

test("dressy but not formal with heels rejects casual foundations and flat shoes", () => {
  const evidence = context({
    title: "Dinner with friends",
    notes: "I want to wear heels and be dress- but not formal",
    high: 82,
  });
  assert.equal(evidence.dressingPosture.formalityFloor, 3);
  assert.equal(evidence.dressingPosture.formalityCeiling, 4);
  assert.ok(evidence.constraintMatrix.hard.some((entry) => entry.code === "user-requires-heels"));

  const casualTank = item("Tops", "GAP black scoop-neck tank top");
  const jeans = item("Jeans", "Cream straight-leg jeans");
  const flats = item("Shoes", "Metallic leather loafers");
  const unverifiedDayDress = item("Dresses", "White linen midi dress");
  for (const garment of [casualTank, jeans]) {
    assert.ok(auditItemEligibility(garment, evidence).rejectionReasons.includes("below-formality-floor"));
  }
  assert.ok(auditItemEligibility(flats, evidence).rejectionReasons.includes("user-required-heels"));
  assert.ok(auditItemEligibility(unverifiedDayDress, evidence).rejectionReasons.includes("unverified-formality-floor"));

  const result = generateGovernedRecommendations({
    wardrobe: [
      casualTank,
      jeans,
      flats,
      unverifiedDayDress,
      item("Dresses", "Silk cocktail gala dress"),
      item("Tops", "Tailored silk short-sleeve blouse"),
      item("Skirts", "Tailored midi skirt"),
      item("Shoes", "Leather block-heel sandals"),
    ],
    context: evidence,
  });
  assert.equal(result.options.length, 1);
  const option = result.options[0];
  assert.ok(!option.itemIds.includes(casualTank.id));
  assert.ok(!option.itemIds.includes(jeans.id));
  assert.ok(!option.itemIds.includes(flats.id));
  assert.match(option.composition.shoes.item_name ?? "", /heel/i);
});

test("no valid outfit returns an honest no-recommendation result", () => {
  const result = generateGovernedRecommendations({
    wardrobe: [item("Tops", "Cotton top")],
    context: context({ title: "Dinner", high: 75 }),
  });
  assert.equal(result.options.length, 0);
  assert.match(result.noRecommendationReason ?? "", /No complete outfit/);
});

test("venue research unavailable remains unknown and contradictory user facts win", () => {
  const evidence = context({
    title: "Concert", location: "Unknown venue",
    notes: "The venue told me bags are prohibited", venueRules: [],
  });
  assert.equal(evidence.bagAllowed.value, false);
  assert.equal(evidence.bagAllowed.source, "user notes");
  assert.ok(evidence.venueRules.length === 0);
});

test("three options use distinct main garments", () => {
  const result = generateGovernedRecommendations({
    wardrobe: summerWardrobe(),
    context: context({ title: "Casual outdoor concert", notes: "Need pockets and no bag", high: 90 }),
    optionCount: 3,
  });
  assert.equal(result.options.length, 3);
  const mainSets = result.options.map((option) => option.itemIds.slice(0, 2).join("|"));
  assert.equal(new Set(mainSets).size, 3);
});

test("ordinary social alternatives use distinct shoes", () => {
  const result = generateGovernedRecommendations({
    wardrobe: summerWardrobe(),
    context: context({ title: "Late lunch and visiting friends", notes: "Comfortable but put together", high: 90 }),
    optionCount: 3,
  });
  assert.equal(result.options.length, 3);
  const shoeIds = result.options.map((option) => option.composition.shoes.id);
  assert.equal(new Set(shoeIds).size, result.options.length);
});

test("a multi-option edit contains at most one tank direction when other foundations qualify", () => {
  const result = generateGovernedRecommendations({
    wardrobe: [
      ...summerWardrobe(),
      item("Tops", "Second ribbed scoop-neck tank top", { color: "Black", rotationScore: 100 }),
      item("Tops", "Third low scoop tank top", { color: "Ivory", rotationScore: 98 }),
    ],
    context: context({ title: "Late lunch and visiting friends", notes: "Comfortable but put together", high: 90 }),
    optionCount: 3,
  });
  assert.equal(result.options.length, 3);
  const tankOptions = result.options.filter((option) =>
    option.composition.foundation.kind === "separates" &&
    /\b(tanks?|camisoles?|shell tanks?)\b/.test(
      `${option.composition.foundation.top.category ?? ""} ${option.composition.foundation.top.item_name ?? ""}`.toLowerCase(),
    ),
  );
  assert.ok(tankOptions.length <= 1);
});

test("bags and fragrances vary across the edit when three compatible choices qualify", () => {
  const result = generateGovernedRecommendations({
    wardrobe: [
      ...summerWardrobe(),
      item("Bags", "Small tan leather shoulder bag", { color: "Tan" }),
      item("Bags", "Navy leather crossbody bag", { color: "Navy" }),
      item("Bags", "Ivory structured handbag", { color: "Ivory" }),
      item("Perfumes / Fragrances", "Neroli eau de parfum"),
    ],
    context: context({ title: "Late lunch and visiting friends", notes: "Comfortable but put together", high: 90 }),
    optionCount: 3,
  });
  assert.equal(result.options.length, 3);
  const bagIds = result.options.map((option) => option.composition.bag?.id);
  const fragranceIds = result.options.map((option) => option.composition.fragrance?.id);
  assert.equal(new Set(bagIds).size, 3);
  assert.equal(new Set(fragranceIds).size, 3);
});

test("a finishing piece may repeat when it is the only compatible owned choice", () => {
  const onlyBag = item("Bags", "Small tan leather shoulder bag", { color: "Tan" });
  const onlyFragrance = item("Perfumes / Fragrances", "Neroli eau de parfum");
  const result = generateGovernedRecommendations({
    wardrobe: [...summerWardrobe().filter((entry) => classifyWardrobeRole(entry) !== "fragrance"), onlyBag, onlyFragrance],
    context: context({ title: "Late lunch and visiting friends", notes: "Comfortable but put together", high: 90 }),
    optionCount: 3,
  });
  assert.equal(result.options.length, 3);
  assert.ok(result.options.every((option) => option.composition.bag?.id === onlyBag.id));
  assert.ok(result.options.every((option) => option.composition.fragrance?.id === onlyFragrance.id));
});

test("hot outdoor recommendation sets contain at most one pants-based option, including cropped pants", () => {
  const result = generateGovernedRecommendations({
    wardrobe: summerWardrobe(),
    context: context({
      title: "Outdoor shopping and lunch",
      notes: "It will be hot outside. Trendy, polished, and comfortable for walking.",
      high: 86,
    }),
    optionCount: 3,
  });
  assert.ok(result.options.length >= 2);
  const pantsOptions = result.options.filter((option) => {
    const labels = option.composition.foundation.kind !== "dress-or-jumpsuit"
      ? [option.composition.foundation.bottom.item_name, option.composition.foundation.bottom.category].join(" ").toLowerCase()
      : "";
    return /\b(pants?|trousers?|jeans?|leggings?|capris?|culottes?)\b/.test(labels);
  });
  assert.ok(pantsOptions.length <= 1);
});

test("unknown indoor/outdoor setting does not trigger the hot-outdoor pants cap", () => {
  // Every bottom here is pants, so the cap is the only thing that could reduce
  // the edit below three complete options.
  const wardrobe = [
    item("Tops", "Casual cotton short sleeve top", { color: "White" }),
    item("Tops", "Casual linen tee", { color: "Pink" }),
    item("Tops", "Casual cotton short sleeve blouse", { color: "Navy" }),
    item("Pants", "Casual cotton lightweight trousers with pockets", { color: "Black" }),
    item("Pants", "Casual cotton twill trousers with pockets", { color: "Khaki" }),
    item("Pants", "Casual linen wide-leg trousers with pockets", { color: "Ivory" }),
    item("Shoes", "Supportive leather sneakers"),
    item("Shoes", "Comfortable flat sandals"),
    item("Shoes", "Walkable loafers"),
  ];
  const result = generateGovernedRecommendations({
    wardrobe,
    context: context({
      title: "Back to school night",
      notes: "Comfortable shoes for walking around campus",
      high: 96,
    }),
    optionCount: 3,
  });
  assert.equal(result.context.setting.value, null);
  assert.equal(result.context.constraintMatrix.heatSeverity, "extreme");
  const pantsOptions = result.options.filter((option) =>
    option.composition.foundation.kind !== "dress-or-jumpsuit" &&
    /\b(pants?|trousers?|jeans?|leggings?|capris?|culottes?)\b/.test(
      [option.composition.foundation.bottom.item_name, option.composition.foundation.bottom.category]
        .join(" ").toLowerCase(),
    ));
  assert.equal(result.options.length, 3);
  assert.ok(pantsOptions.length > 1, "an unknown setting must not cap pants options");
});

test("walking language is recognized beyond the bare word walk", () => {
  const campus = context({
    title: "Back to school night",
    notes: "Comfortable shoes for walking around campus",
    high: 84,
  });
  assert.equal(campus.walking.value, "moderate");
  assert.ok(!campus.unknowns.includes("walking requirement"));

  // Explicit intensity still resolves higher, and silence still stays unknown.
  const heavy = context({ title: "All day walking and sightseeing", high: 80 });
  assert.equal(heavy.walking.value, "high");
  const quiet = context({ title: "Dinner with friends", high: 70 });
  assert.equal(quiet.walking.value, null);
});

test("an elevated polish request raises the formality target to match", () => {
  const posture = context({
    title: "Back to school night",
    notes: "I want to be put together",
    high: 72,
  }).dressingPosture;
  assert.equal(posture.archetype, "everyday-casual-social");
  assert.equal(posture.requestedPolish, "polished-casual");
  assert.equal(posture.formalityTarget, 3);
  assert.equal(posture.formalityCeiling, 3);
});

test("a request with no polish language leaves the formality target alone", () => {
  const posture = context({
    title: "Back to school night",
    notes: "Comfortable shoes for walking around campus",
    high: 72,
  }).dressingPosture;
  assert.equal(posture.requestedPolish, "casual");
  assert.equal(posture.formalityTarget, 2);
});

test("the rationale reports the polish the garments reach, not the one requested", () => {
  const result = generateGovernedRecommendations({
    wardrobe: [
      item("Tops", "Casual cotton tee", { color: "White" }),
      item("Tops", "Casual cotton short sleeve top", { color: "Navy" }),
      item("Pants", "Casual denim jeans", { color: "Blue" }),
      item("Shoes", "Walkable loafers"),
    ],
    context: context({ title: "Back to school night", notes: "I want to be put together", high: 72 }),
    optionCount: 1,
  });
  assert.ok(result.options.length > 0);
  // The foundation averages formality 2 against a polished-casual request, so the
  // rationale must disclose the gap rather than repeat the request back.
  assert.match(result.options[0].rationale, /sits closer to casual than the polished casual you asked for/);
});

test("an evening indoor school event excludes casual shorts", () => {
  const evidence = context({
    title: "Back to school night in the classrooms",
    notes: "Meeting the teachers",
    high: 80,
  });
  assert.equal(evidence.evening.value, true);
  assert.equal(evidence.setting.value, "indoor");
  const policy = buildEventPolicy(evidence);
  assert.equal(policy.archetype, "school-community-day");
  assert.ok(policy.hardConstraints.includes("reject-evening-indoor-leisurewear"));

  const cutoffs = auditItemEligibility(item("Shorts", "Distressed cutoff denim shorts"), evidence, policy);
  assert.equal(cutoffs.eligible, false);
  assert.ok(cutoffs.rejectionReasons.includes("evening-indoor-leisurewear"));
});

test("the evening leisurewear rule stays disarmed when evening or setting is unknown", () => {
  // Indoor is established, but nothing says the event is in the evening.
  const daytime = context({ title: "School open house in the classrooms", notes: "Morning visit", high: 80 });
  assert.equal(daytime.evening.value, null);
  assert.equal(daytime.setting.value, "indoor");
  assert.equal(
    auditItemEligibility(item("Shorts", "Distressed cutoff denim shorts"), daytime, buildEventPolicy(daytime)).eligible,
    true,
  );

  // Evening is established, but the setting was never resolved.
  const unknownSetting = context({ title: "Back to school night", notes: "Meeting the teachers", high: 80 });
  assert.equal(unknownSetting.evening.value, true);
  assert.equal(unknownSetting.setting.value, null);
  assert.equal(
    auditItemEligibility(item("Shorts", "Distressed cutoff denim shorts"), unknownSetting, buildEventPolicy(unknownSetting)).eligible,
    true,
  );
});

test("tailored shorts survive an evening indoor school event", () => {
  const evidence = context({
    title: "Back to school night in the classrooms",
    notes: "Meeting the teachers",
    high: 80,
  });
  const tailored = auditItemEligibility(
    item("Shorts", "High-waisted pleated tailored shorts"),
    evidence,
    buildEventPolicy(evidence),
  );
  // Formality 3 keeps the piece above the casual threshold the rule targets.
  assert.equal(tailored.formality, 3);
  assert.equal(tailored.eligible, true);
});

test("non-breathable synthetic garments are rejected in extreme heat", () => {
  const hot = context({ title: "Outdoor lunch", notes: "It will be very hot", high: 96 });
  const trace = traceOutfitValidation([
    item("Tops", "Casual cotton short sleeve top"),
    item("Skirts", "Faux leather mini skirt"),
    item("Shoes", "Comfortable flat sandals"),
  ], hot);
  assert.ok(trace.rejectionReasons.includes("extreme-heat-nonbreathable-garment"));
  // The trace must report the rule the outfit actually failed.
  assert.equal(trace.hardRules.find((rule) => rule.rule === "context-constraint-matrix")?.passed, false);
});

test("faux leather footwear stays eligible in extreme heat", () => {
  const hot = context({ title: "Outdoor lunch", notes: "It will be very hot", high: 96 });
  const trace = traceOutfitValidation([
    item("Tops", "Casual cotton short sleeve top"),
    item("Shorts", "Casual cotton shorts"),
    item("Shoes", "Faux leather flat sandals"),
  ], hot);
  assert.ok(!trace.rejectionReasons.includes("extreme-heat-nonbreathable-garment"));
});

test("synthetic garments are unaffected when the heat is not extreme", () => {
  const mild = context({ title: "Lunch", high: 72 });
  const trace = traceOutfitValidation([
    item("Tops", "Casual cotton short sleeve top"),
    item("Skirts", "Faux leather mini skirt"),
    item("Shoes", "Comfortable flat sandals"),
  ], mild);
  assert.ok(!trace.rejectionReasons.includes("extreme-heat-nonbreathable-garment"));
});

test("confirmed incompatible pair is rejected with user provenance", () => {
  const top = item("Tops", "Sea embroidered shirt");
  const shorts = item("Shorts", "Orange shorts with pockets");
  const wardrobe = [top, shorts, item("Shoes", "Supportive sneakers")];
  const [a, b] = [top.id, shorts.id].sort();
  const result = generateGovernedRecommendations({
    wardrobe, context: context({ title: "Casual concert", high: 85 }),
    incompatiblePairs: [{ itemAId: a, itemBId: b, reason: "User said these do not match" }],
  });
  assert.equal(result.options.length, 0);
});

test("short-sleeve blouse is a top, never shorts", () => {
  assert.equal(classifyWardrobeRole(item("Tops", "Doen — Ruffled Short-Sleeve Blouse")), "top");
  assert.equal(classifyWardrobeRole(item("Tops", "Comme de Garcon — Short-sleeve T-shirt with heart patch")), "top");
  assert.equal(classifyWardrobeRole(item("Tops", "Pilcro — Striped short-sleeve top")), "top");
});

test("styling suggestions cannot change an item's normalized garment role or traits", () => {
  const shorts = item("Shorts", "Black utility patch-pocket shorts", {
    styling_suggestion: "Pair with sneakers, a silk blouse, or a satin evening top.",
  });
  const top = item("Tops", "White cotton tank top", {
    styling_suggestion: "Wear with pumps, trousers, or a sequined skirt.",
  });
  assert.equal(classifyWardrobeRole(shorts), "bottom");
  assert.equal(classifyWardrobeRole(top), "top");

  const result = generateGovernedRecommendations({
    wardrobe: [
      top,
      shorts,
      item("Shoes", "Supportive leather sneakers"),
      item("Perfumes / Fragrances", "Summer fragrance"),
    ],
    context: context({
      title: "Outdoor stadium concert",
      notes: "No bag; I need pockets for my phone",
      high: 90,
    }),
  });
  assert.equal(result.options.length, 1);
  assert.deepEqual(
    result.options[0].itemIds.slice(0, 2),
    [top.id, shorts.id],
  );
});

test("reported two-top recommendations are structurally impossible", () => {
  const reportedPairs = [
    ["THML — Embroidered flutter-sleeve blouse", "Doen — Ruffled Short-Sleeve Blouse"],
    ["Sleeveless pleated blouse", "Comme de Garcon — Short-sleeve T-shirt with heart patch"],
    ["Ulla Johnson — Rust orange puff-sleeve tie-waist blouse", "Pilcro — Striped short-sleeve top"],
  ];
  for (const [first, second] of reportedPairs) {
    const result = generateGovernedRecommendations({
      wardrobe: [
        item("Tops", first),
        item("Tops", second),
        item("Shoes", "Walkable leather sandals"),
        item("Perfumes / Fragrances", "Summer fragrance"),
      ],
      context: context({ title: "Outdoor stadium concert", high: 90 }),
    });
    assert.equal(result.options.length, 0);
  }
});

test("every returned recommendation has exactly one valid complete foundation", () => {
  const result = generateGovernedRecommendations({
    wardrobe: summerWardrobe(),
    context: context({ title: "Outdoor stadium concert", notes: "No bag; pockets required", high: 90 }),
    optionCount: 3,
  });
  assert.ok(result.options.length);
  for (const option of result.options) {
    const foundation = option.composition.foundation;
    if (foundation.kind === "separates") {
      assert.ok(foundation.top);
      assert.ok(foundation.bottom);
      assert.equal(foundation.onePiece, null);
    } else {
      assert.ok(foundation.onePiece);
      assert.equal(foundation.top, null);
      assert.equal(foundation.bottom, null);
    }
    assert.equal(classifyWardrobeRole(option.composition.shoes), "shoes");
  }
});

test("corrected item metadata is a highest-priority hard exclusion", () => {
  const correctedSkirt = item("Skirts", "Formal satin lace-trim skirt", {
    analysis_metadata: {
      userCorrection: {
        excludeFromRecommendations: true,
        source: "user",
        reason: "User explicitly removed this garment from recommendations",
      },
    },
  });
  const result = generateGovernedRecommendations({
    wardrobe: [
      item("Tops", "Solid cotton top"),
      correctedSkirt,
      item("Shoes", "Walkable leather flats"),
    ],
    context: context({ title: "Dinner", high: 75 }),
  });
  assert.equal(result.options.length, 0);
});

test("missing optional bag is allowed but unknown pockets are not when pockets are required", () => {
  const result = generateGovernedRecommendations({
    wardrobe: [
      item("Tops", "Light cotton concert top"),
      item("Shorts", "Cotton shorts"),
      item("Shoes", "Walkable leather sandals"),
      item("Perfumes / Fragrances", "Summer fragrance"),
    ],
    context: context({
      title: "Outdoor stadium concert",
      notes: "I cannot carry a bag and need pockets for my phone",
      high: 90,
    }),
  });
  assert.equal(result.options.length, 0);
});

test("explicit no-pocket metadata remains a hard rejection when pockets are required", () => {
  const result = generateGovernedRecommendations({
    wardrobe: [
      item("Tops", "Light cotton top", { analysis_metadata: { hasPockets: false } }),
      item("Shorts", "Pocketless shorts", { analysis_metadata: { hasPockets: false } }),
      item("Shoes", "Walkable sandals"),
    ],
    context: context({
      title: "Outdoor stadium concert",
      notes: "I cannot carry a bag and need pockets",
      high: 90,
    }),
  });
  assert.equal(result.options.length, 0);
});

test("free-form AI metadata can never change a garment role", () => {
  const tank = item("Tops", "GAP — Black scoop-neck tank top", {
    analysis_metadata: {
      candidateCategories: ["Shoes", "Sandals", "Tops"],
      analysis: "Could be styled with shoes.",
    },
  });
  assert.equal(classifyWardrobeRole(tank), "top");
});

test("failed acceptance option 1 rejects TOP + BOTTOM + unrelated TOP", () => {
  const evidence = context({
    title: "Noah Kahan Concert at Truist Park",
    notes: "Very hot. No bag. Pockets required.",
    high: 90,
  });
  const trace = traceOutfitValidation([
    item("Tops", "Free People — White eyelet lace sleeveless top"),
    item("Skirts", "JCrew — Tiered gathered midi skirt", { analysis_metadata: { hasPockets: false } }),
    item("Tops", "GAP — Black scoop-neck tank top"),
    item("Perfumes / Fragrances", "Jo Malone — Jasmine Sambac & Marigold Cologne Intense"),
  ], evidence);
  assert.equal(trace.approved, false);
  assert.equal(trace.selectedTemplate, "invalid");
  assert.ok(trace.rejectionReasons.includes("invalid-foundation-structure"));
  assert.ok(trace.rejectionReasons.includes("missing-shoes"));
});

test("failed acceptance option 2 rejects DRESS + unrelated TOP", () => {
  const evidence = context({
    title: "Noah Kahan Concert at Truist Park",
    notes: "Very hot. No bag. Pockets required.",
    high: 90,
  });
  const trace = traceOutfitValidation([
    item("Dresses", "Sleeveless V-neck patterned dress", { analysis_metadata: { hasPockets: false } }),
    item("Tops", "GAP — Black scoop-neck tank top"),
    item("Perfumes / Fragrances", "Jo Malone — Jasmine Sambac & Marigold Cologne Intense"),
  ], evidence);
  assert.equal(trace.approved, false);
  assert.equal(trace.selectedTemplate, "invalid");
  assert.ok(trace.rejectionReasons.includes("invalid-foundation-structure"));
  assert.ok(trace.rejectionReasons.includes("missing-shoes"));
});

test("failed acceptance option 3 rejects unknown pockets and stadium pumps", () => {
  const evidence = context({
    title: "Noah Kahan Concert at Truist Park",
    notes: "Very hot. No bag. Pockets required with significant walking and standing.",
    high: 90,
  });
  const trace = traceOutfitValidation([
    item("Dresses", "Shanghai Tang — Short-sleeve cream dress with blue shoulder detail"),
    item("Shoes", "Jimmy Choo — Metallic strappy T-strap pumps"),
    item("Perfumes / Fragrances", "Jo Malone — Jasmine Sambac & Marigold Cologne Intense"),
  ], evidence);
  assert.equal(trace.approved, false);
  assert.ok(trace.rejectionReasons.includes("pockets-required"));
  assert.ok(trace.rejectionReasons.includes("stadium-footwear"));
});

test("Truist Park fixture approves a complete no-bag outfit with verified pockets", () => {
  const evidence = context({
    title: "Noah Kahan Concert at Truist Park",
    location: "Truist Park",
    notes: "Very hot. No bag. Pockets required with significant walking and standing. Fun but not over the top.",
    high: 90,
  });
  const result = generateGovernedRecommendations({
    wardrobe: [
      item("Tops", "Lightweight cotton concert T-shirt"),
      item("Shorts", "Tailored cotton shorts", { analysis_metadata: { hasPockets: true } }),
      item("Shoes", "Supportive low-top leather sneakers"),
      item("Perfumes / Fragrances", "Fresh citrus summer fragrance"),
    ],
    context: evidence,
  });
  assert.equal(result.options.length, 1);
  assert.equal(result.options[0].composition.foundation.kind, "separates");
  assert.equal(result.options[0].composition.bag, null);
  assert.equal(result.options[0].assessment.valid, true);
});

test("Truist Park context matrix combines heat, venue, utility, and polish before generation", () => {
  const evidence = context({
    title: "Noah Kahan Concert at Truist Park", location: "Truist Park",
    notes: "It will be very hot. I cannot carry a bag and need secure pockets. I want to be fun and polished but not overdone.",
    high: 92,
  });
  assert.equal(evidence.constraintMatrix.heatSeverity, "extreme");
  assert.equal(evidence.constraintMatrix.requestedPolish, "polished-casual");
  const hardCodes = evidence.constraintMatrix.hard.map((entry) => entry.code);
  assert.ok(hardCodes.includes("verified-pockets-required"));
  assert.ok(hardCodes.includes("no-bag"));
  assert.ok(hardCodes.includes("stadium-walking-footwear"));
  assert.ok(hardCodes.includes("no-heat-inappropriate-long-sleeves"));
  assert.ok(evidence.constraintMatrix.strongSoft.some((entry) => entry.code === "avoid-jeans-extreme-heat"));
});

test("failed acceptance: long-sleeve rugby, shorts, and suede boots is rejected", () => {
  const trace = traceOutfitValidation([
    item("Tops", "JCrew — Long-sleeve striped rugby polo shirt"),
    item("Shorts", "Maeve — Black utility patch-pocket shorts", { analysis_metadata: { hasPockets: true } }),
    item("Shoes", "CHANEL — Suede mid-calf boots"),
    item("Perfumes / Fragrances", "Jo Malone London — Jasmine Sambac & Marigold Cologne Intense"),
  ], context({
    title: "Noah Kahan Concert at Truist Park", location: "Truist Park",
    notes: "Very hot, no bag, secure pockets required, fun and polished but not overdone.", high: 92,
  }));
  assert.equal(trace.approved, false);
  assert.ok(trace.rejectionReasons.includes("extreme-heat-long-sleeve"));
  assert.ok(trace.rejectionReasons.includes("hot-stadium-footwear"));
});

test("failed acceptance: tank, jeans, and logo slides is rejected by whole-look review", () => {
  const trace = traceOutfitValidation([
    item("Tops", "GAP — Scoop-neck tank top"),
    item("Jeans", "Maeve — High-rise wide-leg patch-pocket jeans", { analysis_metadata: { hasPockets: true } }),
    item("Shoes", "Nike — Logo slide sandals"),
  ], context({
    title: "Noah Kahan Concert at Truist Park",
    notes: "Above 90 degrees. No bag. Pockets required. Fun and polished, not overdone.", high: 92,
  }));
  assert.equal(trace.approved, false);
  assert.ok(trace.rejectionReasons.includes("insufficient-whole-outfit-polish"));
  assert.ok(trace.rejectionReasons.includes("contextual-stylist-veto"));
});

test("failed acceptance: blouse, cream jeans, and logo slides is rejected", () => {
  const trace = traceOutfitValidation([
    item("Tops", "Sundry — Short-sleeve button-front blouse"),
    item("Jeans", "Mother — Cream straight-leg patch-pocket jeans", { analysis_metadata: { hasPockets: true } }),
    item("Shoes", "Nike — Logo slide sandals"),
  ], context({
    title: "Noah Kahan Concert at Truist Park",
    notes: "Very hot. No bag. Secure pockets required. Make it more polished.", high: 92,
  }));
  assert.equal(trace.approved, false);
  assert.ok(trace.rejectionReasons.includes("contextual-stylist-veto"));
});

test("valid hot-stadium direction passes with breathable pieces and polished walking shoes", () => {
  const result = generateGovernedRecommendations({
    wardrobe: [
      item("Tops", "Sea — Embroidered lightweight cotton sleeveless top", { color: "White" }),
      item("Shorts", "Maeve — Tailored black utility shorts with secure pockets", { analysis_metadata: { hasPockets: true } }),
      item("Shoes", "Veja — Supportive low-top leather sneakers"),
      item("Perfumes / Fragrances", "Jo Malone London — Wood Sage & Sea Salt Cologne"),
    ],
    context: context({
      title: "Noah Kahan Concert at Truist Park",
      notes: "It will be over 90 degrees. No bag. Secure pockets required. Fun and polished, not overdone.", high: 92,
    }),
  });
  assert.equal(result.options.length, 1);
  assert.equal(result.options[0].assessment.valid, true);
  assert.ok((result.options[0].assessment.factorScores.polish ?? 0) >= 80);
});

test("July 28 failed option 1 is removed before generation: formal puff blouse and pointed pumps", () => {
  const wardrobe = [
    item("Tops", "Ulla Johnson — Puff-sleeve blouse"),
    item("Shorts", "Maeve — Black utility patch-pocket shorts", {
      analysis_metadata: { hasPockets: true },
    }),
    item("Shoes", "Betsy Johnson — Gold Glitter Bow Pointed-Toe Pumps"),
    item("Perfumes / Fragrances", "CHANEL — Gardénia perfume"),
  ];
  const result = generateGovernedRecommendations({
    wardrobe,
    context: context({
      title: "Noah Kahan Concert at Truist Park",
      location: "Truist Park",
      notes: "Over 90 degrees. No bag. Secure pockets required. Fun, polished, casual, not overdone.",
      high: 92,
    }),
  });
  assert.equal(result.options.length, 0);
  const blouse = result.eligibilityAudit.find((audit) => audit.label.includes("Puff-sleeve blouse"));
  const pumps = result.eligibilityAudit.find((audit) => audit.label.includes("Pointed-Toe Pumps"));
  assert.equal(blouse?.eligible, false);
  assert.ok(blouse?.rejectionReasons.includes("stadium-formal-eveningwear"));
  assert.equal(pumps?.eligible, false);
  assert.ok(pumps?.rejectionReasons.includes("stadium-ineligible-footwear"));
});

test("July 28 failed option 2 is removed before generation: heavy jeans and plural Pumps alias", () => {
  const wardrobe = [
    item("Tops", "Roland Garros graphic crewneck T-shirt"),
    item("Jeans", "Mother — Cream straight-leg patch-pocket jeans", {
      analysis_metadata: { hasPockets: true },
    }),
    item("Shoes", "Betsy Johnson — Gold Glitter Bow Pointed-Toe Pumps"),
    item("Perfumes / Fragrances", "CHANEL — Gardénia perfume"),
  ];
  const result = generateGovernedRecommendations({
    wardrobe,
    context: context({
      title: "Noah Kahan Concert at Truist Park",
      location: "Truist Park",
      notes: "Over 90 degrees. No bag. Secure pockets required. Fun, polished, casual, not overdone.",
      high: 92,
    }),
  });
  assert.equal(result.options.length, 0);
  const jeans = result.eligibilityAudit.find((audit) => audit.label.includes("Cream straight-leg"));
  const pumps = result.eligibilityAudit.find((audit) => audit.label.includes("Pointed-Toe Pumps"));
  assert.ok(jeans?.rejectionReasons.includes("extreme-heat-heavy-denim-jeans"));
  assert.ok(pumps?.rejectionReasons.includes("stadium-ineligible-footwear"));
});

test("July 28 failed option 3 is removed before generation: formal tie-neck blouse, jeans, and platform slides", () => {
  const wardrobe = [
    item("Tops", "Ted Baker — Sleeveless tie-neck blouse"),
    item("Jeans", "Maeve — High-rise wide-leg patch-pocket jeans", {
      analysis_metadata: { hasPockets: true },
    }),
    item("Shoes", "Chocolat Blue — Platform cross-strap slide sandals"),
    item("Perfumes / Fragrances", "CHANEL — Gardénia perfume"),
  ];
  const result = generateGovernedRecommendations({
    wardrobe,
    context: context({
      title: "Noah Kahan Concert at Truist Park",
      location: "Truist Park",
      notes: "Over 90 degrees. No bag. Secure pockets required. Fun, polished, casual, not overdone.",
      high: 92,
    }),
  });
  assert.equal(result.options.length, 0);
  const blouse = result.eligibilityAudit.find((audit) => audit.label.includes("tie-neck blouse"));
  const jeans = result.eligibilityAudit.find((audit) => audit.label.includes("wide-leg"));
  const slides = result.eligibilityAudit.find((audit) => audit.label.includes("Platform cross-strap"));
  assert.ok(blouse?.rejectionReasons.includes("stadium-formal-eveningwear"));
  assert.ok(jeans?.rejectionReasons.includes("extreme-heat-heavy-denim-jeans"));
  assert.ok(slides?.rejectionReasons.includes("stadium-walking-standing"));
});

test("stadium alternatives use different shoes and return fewer looks when footwear is scarce", () => {
  const wardrobe = [
    item("Tops", "Lightweight cotton concert T-shirt", { color: "White" }),
    item("Tops", "Sleeveless linen shell", { color: "Navy" }),
    item("Tops", "Short-sleeve cotton popover", { color: "Green" }),
    item("Shorts", "Tailored black shorts with secure pockets", {
      analysis_metadata: { hasPockets: true },
    }),
    item("Shorts", "Cotton utility shorts with secure pockets", {
      analysis_metadata: { hasPockets: true },
    }),
    item("Shoes", "Supportive low-top leather sneakers"),
    item("Perfumes / Fragrances", "Fresh citrus fragrance"),
  ];
  const result = generateGovernedRecommendations({
    wardrobe,
    context: context({
      title: "Outdoor stadium concert at Truist Park",
      notes: "Over 90 degrees. No bag. Secure pockets required. Polished casual.",
      high: 92,
    }),
  });
  assert.equal(result.options.length, 1);
  assert.equal(result.options[0].composition.shoes.item_name, "Supportive low-top leather sneakers");
});

test("shopping and outdoor lunch produces a polished-casual look without a venue address", () => {
  const wardrobe = [
    item("Dresses", "Formal silk cocktail dress"),
    item("Dresses", "Beaded evening gown"),
    item("Tops", "Trendy cotton short-sleeve blouse", { color: "Ivory" }),
    item("Shorts", "Tailored linen shorts", { color: "Navy" }),
    item("Shoes", "Comfortable leather walking sandals"),
    item("Perfumes / Fragrances", "Fresh gardenia fragrance"),
  ];
  const result = generateGovernedRecommendations({
    wardrobe,
    context: context({
      title: "Shopping with friends followed by lunch at an outdoor cafe",
      location: undefined,
      notes: "Trendy, polished and weather appropriate. Fun shoes with comfort in mind.",
      high: 86,
    }),
  });
  assert.ok(result.context.unknowns.includes("bag policy"));
  assert.equal(result.context.dressingPosture.archetype, "everyday-casual-social");
  assert.equal(result.stylingBrief.desiredPolish, "polished-casual");
  assert.ok(result.options.length >= 1);
  assert.ok(result.options[0].itemIds.includes(wardrobe[2].id));
  assert.ok(result.options[0].itemIds.includes(wardrobe[3].id));
  assert.ok(!result.options[0].itemIds.includes(wardrobe[0].id));
  assert.ok(!result.options[0].itemIds.includes(wardrobe[1].id));
});

test("a non-formal correction cannot be inverted into a formal request or recycle occasion dresses", () => {
  const evidence = context({
    title: "Neighborhood dinner reached on foot",
    notes: "These formal dresses are inappropriate for this non-formal dinner. Please regenerate with new outfits.",
    high: 88,
  });
  assert.equal(evidence.constraintMatrix.requestedPolish, "polished-casual");
  assert.equal(evidence.dressingPosture.requestedPolish, "polished-casual");
  assert.ok(evidence.constraintMatrix.hard.some((entry) => entry.code === "user-no-formal-occasionwear"));

  const formalDress = item("Dresses", "Black lace short-sleeve mini shift dress");
  const result = generateGovernedRecommendations({
    wardrobe: [
      formalDress,
      item("Tops", "Lightweight cotton short-sleeve blouse"),
      item("Skirts", "Casual cotton A-line skirt"),
      item("Shoes", "Comfortable leather walking loafers"),
      item("Handbags", "Small leather crossbody bag"),
      item("Perfumes / Fragrances", "Fresh summer fragrance"),
    ],
    context: evidence,
  });
  const formalAudit = result.eligibilityAudit.find((audit) => audit.itemId === formalDress.id);
  assert.ok(formalAudit?.rejectionReasons.includes("user-rejected-formal-occasionwear"));
  assert.equal(result.options.length, 1);
  assert.equal(result.stylingBrief.desiredPolish, "polished-casual");
  assert.ok(result.options[0]?.composition.bag);
  assert.ok(result.options[0]?.composition.fragrance);
  assert.ok(!result.options[0]?.itemIds.includes(formalDress.id));
});

test("team apparel is reserved for explicit team or game-watching occasions", () => {
  const teamTop = item("Shirts", "College raglan graphic shirt", {
    designer: "Campus label",
    styling_suggestion: "Keep for game-day and team-watching plans.",
  });
  const ordinary = auditItemEligibility(teamTop, context({
    title: "Lunch followed by visiting friends",
    high: 88,
  }));
  assert.ok(ordinary.rejectionReasons.includes("team-apparel-without-team-occasion"));

  const game = auditItemEligibility(teamTop, context({
    title: "Watching the team play at a friend’s house",
    high: 88,
  }));
  assert.ok(!game.rejectionReasons.includes("team-apparel-without-team-occasion"));
});

test("statement shoes or an embroidered multicolor bag cannot compete with a statement foundation", () => {
  const evidence = context({ title: "Casual lunch and visiting friends", high: 90 });
  const sportsLook = traceOutfitValidation([
    item("Shirts", "Graphic raglan shirt", { color: "White and blue" }),
    item("Jeans", "Medium-wash straight-leg jeans", { color: "Blue" }),
    item("Shoes", "Metallic silver star-detail loafers", { color: "Silver" }),
    item("Handbags", "Multicolor embroidered knot-front clutch", { color: "Multicolor" }),
    item("Perfumes / Fragrances", "Garden fragrance"),
  ], evidence);
  assert.ok(sportsLook.rejectionReasons.includes("competing-statement-elements"));

  const dressLook = traceOutfitValidation([
    item("Dresses", "Baroque-print strappy mini dress", { color: "Multicolor" }),
    item("Shoes", "Metallic silver star-detail loafers", { color: "Silver" }),
    item("Handbags", "Multicolor embroidered knot-front clutch", { color: "Multicolor" }),
    item("Perfumes / Fragrances", "Garden fragrance"),
  ], evidence);
  assert.ok(dressLook.rejectionReasons.includes("competing-statement-elements"));
});

test("balanced candidate search reaches suitable casual pieces beyond the first eight in each role", () => {
  const formalTops = Array.from({ length: 10 }, (_, index) =>
    item("Tops", `Formal silk evening blouse ${index}`));
  const formalBottoms = Array.from({ length: 10 }, (_, index) =>
    item("Skirts", `Formal satin cocktail skirt ${index}`));
  const formalShoes = Array.from({ length: 9 }, (_, index) =>
    item("Shoes", `Formal pointed-toe pump ${index}`));
  const casualTop = item("Tops", "Polished cotton short-sleeve top");
  const casualBottom = item("Shorts", "Tailored linen shorts");
  const casualShoes = item("Shoes", "Comfortable leather walking sandals");
  const result = generateGovernedRecommendations({
    wardrobe: [
      ...formalTops, casualTop,
      ...formalBottoms, casualBottom,
      ...formalShoes, casualShoes,
    ],
    context: context({
      title: "Shopping and lunch with friends",
      notes: "Polished, trendy, and comfortable.",
      high: 84,
    }),
  });
  assert.ok(result.options.length >= 1);
  assert.ok(result.options[0].itemIds.includes(casualTop.id));
  assert.ok(result.options[0].itemIds.includes(casualBottom.id));
  assert.ok(result.options[0].itemIds.includes(casualShoes.id));
});

test("an everyday lunch rejects unverified dressy one-pieces instead of calling them casual", () => {
  const evidence = context({
    title: "Lunch appointment followed by ordinary daytime plans",
    notes: "Put together, but this is not a formal occasion.",
    high: 86,
  });
  const ornateDress = item("Dresses", "Embroidered strappy tiered midi dress");
  const velvetJumpsuit = item("Jumpsuits", "Velvet bow jumpsuit");
  const casualDress = item("Dresses", "Cotton poplin day dress");

  for (const garment of [ornateDress, velvetJumpsuit]) {
    const audit = auditItemEligibility(garment, evidence);
    assert.ok(audit.rejectionReasons.includes("everyday-one-piece-unverified"));
  }
  assert.equal(auditItemEligibility(casualDress, evidence).eligible, true);

  const result = generateGovernedRecommendations({
    wardrobe: [
      ornateDress,
      velvetJumpsuit,
      casualDress,
      item("Shoes", "Neutral leather walking sandals"),
      item("Handbags", "Tan leather crossbody bag"),
      item("Perfumes / Fragrances", "Fresh citrus fragrance"),
    ],
    context: evidence,
  });
  assert.equal(result.options.length, 1);
  assert.ok(result.options[0].itemIds.includes(casualDress.id));
  assert.ok(!result.options[0].itemIds.includes(ornateDress.id));
  assert.ok(!result.options[0].itemIds.includes(velvetJumpsuit.id));
});

test("a patterned statement dress rejects contrasting statement sneakers", () => {
  const evidence = context({ title: "Casual lunch appointment", high: 84 });
  const look = traceOutfitValidation([
    item("Dresses", "Cotton Farm-style multicolor patterned day dress"),
    item("Shoes", "Black and white contrast sneakers"),
    item("Handbags", "Solid tan leather bag"),
    item("Perfumes / Fragrances", "Fresh citrus fragrance"),
  ], evidence);
  assert.ok(look.rejectionReasons.includes("competing-statement-elements"));
});

test("deep retrieval finds a third qualified shoe beyond rejected high-ranked footwear", () => {
  const evidence = context({ title: "Outdoor lunch followed by visiting friends", high: 86 });
  const dresses = ["Blue", "Green", "Rose"].map((color, index) => item(
    "Dresses",
    `Cotton floral day dress ${index + 1}`,
    { color, rotationScore: 90 - index },
  ));
  const competingShoes = Array.from({ length: 10 }, (_, index) => item(
    "Shoes",
    `Metallic embellished statement sneaker ${index + 1}`,
    { rotationScore: 100 - index },
  ));
  const qualifiedShoes = Array.from({ length: 3 }, (_, index) => item(
    "Shoes",
    `Solid neutral leather walking sandal ${index + 1}`,
    { rotationScore: 89 - index },
  ));
  const result = generateGovernedRecommendations({
    wardrobe: [
      ...dresses,
      ...competingShoes,
      ...qualifiedShoes,
      item("Handbags", "Solid tan leather crossbody bag"),
      item("Perfumes / Fragrances", "Fresh citrus fragrance"),
    ],
    context: evidence,
    optionCount: 3,
  });
  assert.equal(result.options.length, 3);
  assert.equal(new Set(result.options.map((option) => option.composition.shoes.id)).size, 3);
  assert.ok(result.options.every((option) =>
    qualifiedShoes.some((shoe) => shoe.id === option.composition.shoes.id)
  ));
});

test("a broad wardrobe finds three options inside the interactive compute budget", () => {
  const broadWardrobe = [
    ...Array.from({ length: 20 }, (_, index) => item("Tops", `Solid cotton blouse ${index + 1}`, { rotationScore: 80 - index })),
    ...Array.from({ length: 20 }, (_, index) => item("Skirts", `Solid cotton casual skirt ${index + 1}`, { rotationScore: 80 - index })),
    ...Array.from({ length: 32 }, (_, index) => item("Shoes", `Solid leather walking sandal ${index + 1}`, { rotationScore: 80 - index })),
    ...Array.from({ length: 3 }, (_, index) => item("Handbags", `Solid leather shoulder bag ${index + 1}`)),
    ...Array.from({ length: 3 }, (_, index) => item("Perfumes / Fragrances", `Fresh fragrance ${index + 1}`)),
  ];
  const startedAt = performance.now();
  const result = generateGovernedRecommendations({
    wardrobe: broadWardrobe,
    context: context({ title: "Dinner with stylish friends", notes: "Polished and cool", high: 82 }),
    optionCount: 3,
  });
  const elapsedMs = performance.now() - startedAt;
  assert.equal(result.options.length, 3);
  assert.ok(result.diagnostics.length <= 120);
  assert.ok(elapsedMs < 2_000, `Broad wardrobe generation took ${elapsedMs.toFixed(0)}ms`);
});

test("an explicitly requested owned hat is included in every surfaced option", () => {
  const hat = item("Hats", "Kemo Sabe western felt hat", { designer: "Kemo Sabe" });
  const wardrobe = [
    hat,
    ...Array.from({ length: 3 }, (_, index) => item("Tops", `Cotton country shirt ${index + 1}`)),
    ...Array.from({ length: 3 }, (_, index) => item("Shorts", `Denim shorts ${index + 1}`)),
    ...Array.from({ length: 3 }, (_, index) => item("Shoes", `Leather walking sneaker ${index + 1}`)),
    item("Handbags", "Clear stadium crossbody bag"),
    item("Perfumes / Fragrances", "Warm woody fragrance"),
  ];
  const requested = resolveExplicitlyRequestedItemIds(
    wardrobe,
    "I want a country but polished feel and I want to wear my Kemo Sabe hat.",
  );
  assert.deepEqual(requested, [hat.id]);
  const result = generateGovernedRecommendations({
    wardrobe,
    context: context({ title: "Country concert at Mercedes-Benz Stadium", high: 84 }),
    requiredItemIds: requested,
    optionCount: 3,
  });
  assert.equal(result.options.length, 3);
  assert.ok(result.options.every((option) => option.itemIds.includes(hat.id)));
});

test("a regenerated must-include correction still resolves the owned hat", () => {
  const hat = item("Accessories", "Rust brown wide-brim felt hat with feather trim", {
    designer: "Kemo Sabe",
    subcategory: "Hats",
  });
  const requested = resolveExplicitlyRequestedItemIds(
    [hat],
    "Every option must include my Kemo Sabe hat, express a country but polished direction.",
  );
  assert.deepEqual(requested, [hat.id]);
});

test("a verified clear-bag stadium policy rejects ordinary handbags", () => {
  const venueRules: VenueRule[] = [{
    kind: "bag-policy",
    statement: "Clear stadium bags only.",
    effect: "clear-bag-only",
    sourceUrl: "https://www.mercedesbenzstadium.com/guidelines",
    retrievedAt: "2026-08-21T12:00:00.000Z",
    confidence: "high",
  }];
  const evidence = context({
    title: "Country concert at Mercedes-Benz Stadium",
    location: "Mercedes-Benz Stadium",
    high: 84,
    venueRules,
  });
  const ordinary = auditItemEligibility(item("Handbags", "Quilted leather shoulder bag"), evidence);
  const clear = auditItemEligibility(item("Handbags", "Clear stadium-approved crossbody bag"), evidence);
  assert.ok(ordinary.rejectionReasons.includes("stadium-bag-policy"));
  assert.equal(clear.eligible, true);
});

test("Mercedes-Benz Stadium policy remains fail-closed when live research is unavailable", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("offline");
  });
  const rules = await researchVenue("Mercedes-Benz Stadium", new Date("2026-08-21T12:00:00.000Z"));
  assert.equal(rules[0]?.effect, "clear-bag-only");
  assert.equal(rules[0]?.sourceUrl, "https://www.mercedesbenzstadium.com/guidelines");
});
