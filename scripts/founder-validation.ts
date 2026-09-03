import { readFile, writeFile } from "node:fs/promises";
import { classifyOccasion, inferDressCode } from "@/lib/daily-agenda/classify";
import { buildContextEvidence } from "@/lib/recommendations/engine/context-evidence";
import { buildEventPolicy } from "@/lib/recommendations/engine/event-policy";
import { generateGovernedRecommendations } from "@/lib/recommendations/engine/governed-engine";
import type { EngineWardrobeItem, GovernedOutfit } from "@/lib/recommendations/engine/types";
import type { StyleProfileSnapshot } from "@/lib/recommendations/engine/style-profile";
import type { DailyAgendaItem } from "@/types/daily-agenda";

type WardrobeCard = {
  favorite: boolean;
  heading: string;
  id: string;
  img: string;
  paragraphs: string[];
};

type Scenario = {
  number: number;
  title: string;
  location: string;
  notes: string;
  dressCode: string;
  intention: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  rain: number;
  start: string;
  end: string;
};

const scenarios: Scenario[] = [
  {
    number: 1,
    title: "Outdoor concert at Truist Park",
    location: "Truist Park, Atlanta",
    notes: "Outdoor stadium concert with prolonged walking and standing. It will be very hot. No bag; secure pockets are required.",
    dressCode: "polished casual",
    intention: "Fun, polished, casual, age-appropriate, and not overdone.",
    temperature: 94,
    feelsLike: 100,
    humidity: 72,
    rain: 15,
    start: "2026-07-28T18:00:00-04:00",
    end: "2026-07-28T23:00:00-04:00",
  },
  {
    number: 2,
    title: "Nice dinner with friends",
    location: "Atlanta restaurant",
    notes: "Indoor dinner with friends. Minimal walking.",
    dressCode: "elevated casual",
    intention: "Polished, warm, social, and quietly special.",
    temperature: 76,
    feelsLike: 78,
    humidity: 60,
    rain: 10,
    start: "2026-07-28T19:30:00-04:00",
    end: "2026-07-28T22:00:00-04:00",
  },
  {
    number: 3,
    title: "Casual lunch",
    location: "Atlanta café",
    notes: "A relaxed lunch with a friend.",
    dressCode: "casual",
    intention: "Easy and approachable, but still considered.",
    temperature: 82,
    feelsLike: 85,
    humidity: 64,
    rain: 15,
    start: "2026-07-28T12:30:00-04:00",
    end: "2026-07-28T14:00:00-04:00",
  },
  {
    number: 4,
    title: "Property tour and real estate client meeting",
    location: "Atlanta properties",
    notes: "Business meeting with several property tours, indoor and outdoor transitions, stairs, and significant walking.",
    dressCode: "business casual",
    intention: "Professional, capable, polished, and practical.",
    temperature: 84,
    feelsLike: 88,
    humidity: 66,
    rain: 20,
    start: "2026-07-28T10:00:00-04:00",
    end: "2026-07-28T15:30:00-04:00",
  },
  {
    number: 5,
    title: "Airport travel day",
    location: "Hartsfield-Jackson Atlanta International Airport",
    notes: "Flight and airport travel with extensive walking, sitting, luggage, and temperature changes.",
    dressCode: "polished travel layers",
    intention: "Comfortable, composed, and presentable on arrival.",
    temperature: 70,
    feelsLike: 69,
    humidity: 50,
    rain: 10,
    start: "2026-07-28T07:00:00-04:00",
    end: "2026-07-28T14:00:00-04:00",
  },
  {
    number: 6,
    title: "Date night dinner and drinks",
    location: "Atlanta",
    notes: "Indoor dinner followed by cocktails. Limited walking.",
    dressCode: "polished",
    intention: "Romantic, confident, feminine, and refined.",
    temperature: 75,
    feelsLike: 76,
    humidity: 55,
    rain: 5,
    start: "2026-07-28T19:00:00-04:00",
    end: "2026-07-28T23:00:00-04:00",
  },
  {
    number: 7,
    title: "Saturday shopping",
    location: "Buckhead, Atlanta",
    notes: "A day of boutiques, errands, and extended walking with indoor and outdoor transitions.",
    dressCode: "polished casual",
    intention: "Effortless, stylish, comfortable, and put together.",
    temperature: 81,
    feelsLike: 84,
    humidity: 61,
    rain: 10,
    start: "2026-07-28T11:00:00-04:00",
    end: "2026-07-28T16:00:00-04:00",
  },
  {
    number: 8,
    title: "Business casual client meeting",
    location: "Atlanta office",
    notes: "Indoor professional meeting with a client.",
    dressCode: "business casual",
    intention: "Credible, polished, modern, and not overly formal.",
    temperature: 72,
    feelsLike: 72,
    humidity: 45,
    rain: 5,
    start: "2026-07-28T10:00:00-04:00",
    end: "2026-07-28T12:00:00-04:00",
  },
  {
    number: 9,
    title: "Outdoor brunch",
    location: "Atlanta patio",
    notes: "Outdoor patio brunch in warm weather with moderate walking.",
    dressCode: "polished casual",
    intention: "Fresh, feminine, social, and relaxed.",
    temperature: 85,
    feelsLike: 89,
    humidity: 68,
    rain: 15,
    start: "2026-07-28T11:30:00-04:00",
    end: "2026-07-28T14:00:00-04:00",
  },
  {
    number: 10,
    title: "Rainy day appointments and lunch",
    location: "Atlanta",
    notes: "A rainy day with moderate walking, errands, appointments, and lunch.",
    dressCode: "polished casual",
    intention: "Weather-ready, composed, practical, and polished.",
    temperature: 62,
    feelsLike: 59,
    humidity: 88,
    rain: 90,
    start: "2026-07-28T10:00:00-04:00",
    end: "2026-07-28T15:00:00-04:00",
  },
];

function wardrobe(cards: WardrobeCard[]): EngineWardrobeItem[] {
  return cards.map((card) => {
    const [department = "Women", taxonomy = "Other", color = ""] =
      (card.paragraphs[1] ?? "").split(" · ").map((value) => value.trim());
    const [category = "Other", subcategory, subcategory2] =
      taxonomy.split(" / ").map((value) => value.trim());
    return {
      id: card.id,
      designer: card.paragraphs[0] || null,
      item_name: card.heading,
      department,
      category,
      subcategory: subcategory || null,
      subcategory_2: subcategory2 || null,
      color: color || null,
      availability_status: "available",
      favorite: card.favorite,
      rotationScore: card.favorite ? 53 : 50,
    };
  });
}

function agenda(scenario: Scenario): DailyAgendaItem {
  const raw = { title: scenario.title, location: scenario.location, isAllDay: false };
  const occasionClassification = classifyOccasion(raw);
  return {
    id: `founder-scenario-${scenario.number}`,
    source: "manual",
    title: scenario.title,
    startTime: scenario.start,
    endTime: scenario.end,
    isAllDay: false,
    location: scenario.location,
    occasionClassification,
    dressCodeInference: inferDressCode(raw, occasionClassification),
    provider: null,
    calendarName: null,
    isReadOnly: false,
    userCorrection: null,
    hasTimeConflict: false,
    overlapsWithItemIds: [],
  };
}

function context(scenario: Scenario) {
  return buildContextEvidence({
    agendaItem: agenda(scenario),
    notes: scenario.notes,
    statedDressCode: scenario.dressCode,
    intention: scenario.intention,
    weather: {
      current: {
        temperature_2m: scenario.temperature,
        apparent_temperature: scenario.feelsLike,
        relative_humidity_2m: scenario.humidity,
        precipitation_probability: scenario.rain,
      },
      daily: {
        temperature_2m_max: [scenario.temperature],
        temperature_2m_min: [scenario.temperature - 10],
        precipitation_probability_max: [scenario.rain],
      },
    },
  });
}

function label(item: EngineWardrobeItem | null) {
  if (!item) return "None";
  return [item.designer, item.item_name].filter(Boolean).join(" — ");
}

function outfitItems(option: GovernedOutfit) {
  const foundation = option.composition.foundation.kind === "dress-or-jumpsuit"
    ? [`Primary: ${label(option.composition.foundation.onePiece)}`]
    : [
      `Top: ${label(option.composition.foundation.top)}`,
      `Bottom: ${label(option.composition.foundation.bottom)}`,
    ];
  return [
    ...foundation,
    `Shoes: ${label(option.composition.shoes)}`,
    `Bag: ${label(option.composition.bag)}`,
    `Outer layer: ${label(option.composition.outerLayer)}`,
    `Jewelry: ${option.composition.jewelry.map(label).join(", ") || "None"}`,
    `Fragrance: ${label(option.composition.fragrance)}`,
  ];
}

function score(value: number | null) {
  return value == null ? "Not scored (neutral Style Profile)" : `${Math.round(value)}/100`;
}

function evidenceLine(
  values: Array<{ value: unknown; confidence: string }>,
  render: (value: unknown) => string = String,
) {
  if (!values.length) return "None established";
  return values.slice(0, 5).map((entry) => `${render(entry.value)} (${entry.confidence})`).join("; ");
}

function styleDirectives(result: ReturnType<typeof generateGovernedRecommendations>) {
  const directives = result.stylingBrief.directives;
  if (!directives.length) {
    return "Neutral: no deployed survey answers, confirmed worn outfits, approvals, rejections, or high-confidence behavioral patterns were available.";
  }
  return directives.map((directive) =>
    `${directive.kind}: ${directive.value} [${directive.provenance}, ${directive.confidence}]`
  ).join("; ");
}

async function main() {
  const args = process.argv.slice(2);
  const input = args[args.indexOf("--input") + 1];
  const output = args[args.indexOf("--output") + 1];
  if (!input || !output) {
    throw new Error("Usage: tsx scripts/founder-validation.ts --input wardrobe.json --output report.md");
  }
  const cards = JSON.parse(await readFile(input, "utf8")) as WardrobeCard[];
  const realWardrobe = wardrobe(cards);
  const userId = "founder-validation-private";
  const styleProfile: StyleProfileSnapshot = {
    userId,
    version: "founder-validation-neutral-v1",
    status: "empty",
    preferences: [],
    updatedAt: new Date().toISOString(),
  };
  const sections: string[] = [
    "# Curated Founder Validation Suite",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Evidence boundary",
    "",
    `- Wardrobe: ${realWardrobe.length} authenticated women’s wardrobe records.`,
    "- Explicit Style Survey: not available in the current production Profile.",
    "- Confirmed worn outfits: none visible in Wardrobe History.",
    "- Style Archive: no entries visible.",
    "- Availability assumption: records visible in My Wardrobe were treated as available because the wardrobe cards expose no contrary status.",
    "- This is a private, local validation artifact. It was not deployed.",
    "",
  ];

  for (const scenario of scenarios) {
    const scenarioContext = context(scenario);
    const policy = buildEventPolicy(scenarioContext);
    const result = generateGovernedRecommendations({
      wardrobe: realWardrobe,
      context: scenarioContext,
      userId,
      styleProfile,
      optionCount: 3,
    });
    const evidence = result.stylingBrief.wardrobeEvidence;
    sections.push(
      `## ${scenario.number}. ${scenario.title}`,
      "",
      `**Context:** ${scenario.location}; ${scenario.temperature}°F, feels like ${scenario.feelsLike}°F; ${scenario.rain}% precipitation; ${scenario.dressCode}.`,
      "",
      `**Event Policy:** ${policy.archetype} (${policy.policyVersion})`,
      "",
      `- Hard: ${policy.hardConstraints.join(", ") || "None"}`,
      `- Strong preferences: ${policy.strongPreferences.join(", ") || "None"}`,
      `- Preferences: ${policy.preferences.join(", ") || "None"}`,
      "",
      `**Style Interpretation:** ${styleDirectives(result)}`,
      "",
      "**Wardrobe Evidence used:**",
      "",
      `- Dominant silhouettes: ${evidenceLine(evidence.dominantSilhouettes)}`,
      `- Recurring colors: ${evidenceLine(evidence.recurringColorFamilies)}`,
      `- Material patterns: ${evidenceLine(evidence.materialPatterns)}`,
      `- Formality distribution: ${evidenceLine(evidence.formalityDistribution, (value) => {
        const entry = value as { level: number | null; count: number; share: number };
        return `level ${entry.level ?? "unknown"}: ${entry.count} (${Math.round(entry.share * 100)}%)`;
      })}`,
      `- Occasion distribution: ${evidenceLine(evidence.occasionDistribution, (value) => {
        const entry = value as { occasion: string; count: number; share: number };
        return `${entry.occasion}: ${entry.count} (${Math.round(entry.share * 100)}%)`;
      })}`,
      `- Frequently worn combinations: ${evidence.frequentlyWornCombinations.length ? evidenceLine(evidence.frequentlyWornCombinations) : "None available"}`,
      `- Repeated contextual rejections: ${evidence.repeatedlyRejectedInContexts.length ? evidenceLine(evidence.repeatedlyRejectedInContexts) : "None available"}`,
      "",
    );
    if (!result.options.length) {
      sections.push(
        "**No recommendation:** No complete outfit passed the current deterministic constraints and Editorial Review.",
        "",
      );
      continue;
    }
    result.options.forEach((option, index) => {
      sections.push(
        `### Option ${index + 1}`,
        "",
        ...outfitItems(option).map((item) => `- ${item}`),
        "",
        `**Why Curated selected it:** ${option.rationale}`,
        "",
        `- Cohesion score: ${score(option.personalStyle.cohesionScore ?? option.assessment.factorScores.cohesion)}`,
        `- Personal Polish score: ${score(option.personalStyle.personalPolishScore ?? option.assessment.factorScores.polish)}`,
        `- Confidence: ${option.assessment.confidence}`,
        `- Governed total score: ${option.assessment.score}`,
        "",
      );
    });
  }
  await writeFile(output, `${sections.join("\n")}\n`, "utf8");
  console.log(JSON.stringify({
    wardrobeCount: realWardrobe.length,
    scenarioCount: scenarios.length,
    output,
  }));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
