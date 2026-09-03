import { STYLE_SURVEY_SCHEMA_VERSION } from "@/types/style-profile";

export type SurveyQuestion = {
  id: string;
  chapter: 1 | 2 | 3 | 4;
  core: boolean;
  title: string;
  prompt: string;
  kind: "single" | "multi" | "ranked" | "matrix" | "text";
  options?: Array<{ id: string; label: string }>;
  rows?: Array<{ id: string; label: string }>;
  max?: number;
  rankMax?: number;
  maxLength?: number;
};

const o = (id: string, label: string) => ({ id, label });

export const STYLE_SURVEY_CHAPTERS = [
  { id: 1, title: "How you want to feel", deck: "Intent, polish, practicality, and expression." },
  { id: 2, title: "What feels like you", deck: "Silhouette, fit, color, pattern, and style language." },
  { id: 3, title: "What works in real life", deck: "Comfort, footwear, weather, fabrics, bags, and garment roles." },
  { id: 4, title: "What deserves a place", deck: "Wardrobe priorities, references, shopping context, and the details you choose to share." },
] as const;

const polish = ["relaxed", "considered", "polished", "highly_dressed", "varies", "not_part_of_my_life"].map((id) => o(id, id.replaceAll("_", " ")));
const colors = ["black", "white_ivory_cream", "grey_silver", "camel_tan_brown", "navy", "blue", "green", "yellow_gold", "orange_rust", "red_burgundy", "pink_rose", "purple_aubergine", "metallics", "multicolor", "changes_by_season"].map((id) => o(id, id.replaceAll("_", " / ")));

export const STYLE_SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: "q1_balance", chapter: 1, core: true, title: "The balance Curated should strike", prompt: "When practicality and expression pull in different directions, where should Curated usually begin?", kind: "single", options: [
    o("practical_first", "Practical first; keep style quietly present"), o("practical_lean", "Mostly practical, with one considered detail"), o("balanced", "Balance practicality and expression"), o("expressive_lean", "More expressive when the day allows"), o("expressive_first_within_constraints", "Lead with expression, while respecting real constraints"),
  ]},
  { id: "q2_everyday_polish", chapter: 1, core: true, title: "Everyday level of polish", prompt: "On an ordinary day, how finished do you like to feel?", kind: "single", options: [
    o("relaxed", "Relaxed and unstudied"), o("easy_considered", "Easy, with one considered element"), o("polished", "Clearly polished"), o("highly_composed", "Fully composed, even for an ordinary day"), o("context_dependent", "It depends entirely on the day"),
  ]},
  { id: "q3_occasion_polish", chapter: 1, core: true, title: "Polish by occasion", prompt: "How polished do you usually want to feel for each part of life?", kind: "matrix", rows: [
    o("errands", "Errands / everyday tasks"), o("work", "Work or professional plans"), o("social", "Social plans"), o("dinner", "Dinner"), o("travel", "Travel days"), o("formal", "Formal or ceremonial occasions"),
  ], options: polish },
  { id: "q4_casual_elevated", chapter: 1, core: true, title: "Casual or elevated when both work", prompt: "When both would be appropriate, which direction are you more likely to choose?", kind: "single", options: [
    o("more_likely_a", "Relaxed foundation with a polished detail"), o("more_likely_b", "Elevated foundation softened with something easy"), o("equally_likely", "Equally likely"), o("depends_on_occasion", "It depends on the occasion"),
  ]},
  { id: "q5_style_words", chapter: 1, core: true, title: "What style should communicate", prompt: "What would you like your style to communicate? Choose up to five; the order you choose becomes your top-three ranking.", kind: "ranked", max: 5, rankMax: 3, options: ["assured","at_ease","considered","creative","discreet","distinctive","elegant","energetic","grounded","modern","playful","polished","romantic","strong","warm","unconventional"].map((id) => o(id, id.replaceAll("_", " "))) },
  { id: "q6_silhouette", chapter: 2, core: true, title: "Silhouette directions", prompt: "Which shapes are you more likely to feel like yourself in?", kind: "matrix", rows: [o("structured_fluid","Structured / fluid"),o("defined_straight","Defined waist / straight line"),o("close_relaxed","Close or skimmed fit / relaxed volume"),o("single_layer_layered","Clean single layer / layered composition")], options: [o("left","More likely the first"),o("right","More likely the second"),o("both","Both"),o("neither","Neither"),o("depends","Depends")] },
  { id: "q7_fit", chapter: 2, core: true, title: "Fit preferences by garment type", prompt: "How do you usually prefer these pieces to fit?", kind: "matrix", rows: [o("tops","Tops and shirts"),o("knitwear","Knitwear"),o("outerwear","Jackets and outerwear"),o("trousers","Trousers and jeans"),o("skirts","Skirts"),o("dresses","Dresses or one-piece dressing")], options: ["close","skimming","relaxed","oversized","varies","do_not_wear"].map((id) => o(id,id.replaceAll("_"," "))) },
  { id: "q8_colors_enjoy", chapter: 2, core: true, title: "Colors to return to", prompt: "Which colors do you enjoy wearing? Choose up to three first if you want Curated to return to them often.", kind: "ranked", max: 14, rankMax: 3, options: colors },
  { id: "q9_colors_avoid", chapter: 2, core: true, title: "Colors to use carefully", prompt: "Are there colors you would rather Curated use sparingly?", kind: "multi", options: [o("none","None"), ...colors] },
  { id: "q10_patterns", chapter: 2, core: true, title: "Pattern tolerance", prompt: "How much pattern usually feels right?", kind: "single", options: [o("solids_preferred","Mostly solids"),o("subtle_pattern","Subtle texture or quiet pattern"),o("one_pattern","One clear pattern at a time"),o("pattern_comfortable","Comfortable with noticeable pattern"),o("pattern_mix","Open to considered pattern mixing"),o("depends","It depends")] },
  { id: "q11_comfort", chapter: 3, core: true, title: "Comfort non-negotiables", prompt: "What should Curated protect without needing to ask each time?", kind: "multi", options: ["easy_movement","comfortable_sitting","walkable_footwear","low_carrying_burden","breathable_fabrics","warmth","light_layers","soft_materials","no_restrictive_waistbands","preferred_coverage","easy_closures","mobility_accessibility","sensory_considerations","no_standing_requirements","none_consistent"].map((id) => o(id,id.replaceAll("_"," "))) },
  { id: "q12_footwear", chapter: 3, core: true, title: "Footwear and heel tolerance", prompt: "Which shoes are you genuinely comfortable wearing? Choose all that apply.", kind: "multi", options: ["flat_sandals","sneakers","loafers_flats","boots","low_heels","mid_heels","high_heels","platforms_wedges","dress_shoes","flat_only","heel_1","heel_2","heel_3","heel_over_3","heel_depends","no_heels"].map((id) => o(id,id.replaceAll("_"," "))) },
  { id: "q13_weather", chapter: 3, core: true, title: "Weather sensitivity", prompt: "Which conditions affect what you can comfortably wear?", kind: "matrix", rows: ["cold","heat","humidity","rain","wind"].map((id) => o(id,id)), options: ["not_especially_sensitive","somewhat_sensitive","very_sensitive","depends","not_sure"].map((id) => o(id,id.replaceAll("_"," "))) },
  { id: "q14_priorities", chapter: 4, core: true, title: "Wardrobe priorities", prompt: "What would you most like Curated to help your wardrobe do? Choose up to five; choose the most important first.", kind: "ranked", max: 5, rankMax: 3, options: ["easier_everyday","confident_work","intentional_social","use_more_owned","rewear_favorites","better_complete_outfits","weather_transitions","pack_less","clearer_point_of_view","more_color_pattern","fit_comfort","buy_fewer_better","recognize_gaps","care_maintain","new_life_chapter"].map((id) => o(id,id.replaceAll("_"," "))) },
  { id: "q15_materials", chapter: 3, core: false, title: "Fabric and material preferences", prompt: "Are there materials you seek out or prefer not to wear?", kind: "multi", options: ["no_consistent_preference","not_sure","cotton","linen","wool","cashmere","silk","satin","denim","leather","suede","velvet","lace","technical","synthetics","embellishment","faux_fur"].map((id) => o(id,id.replaceAll("_"," "))) },
  { id: "q16_accessories", chapter: 4, core: false, title: "Jewelry and accessory presence", prompt: "How present do you like jewelry and accessories to feel?", kind: "single", options: ["minimal","one_signature","layered_quiet","statement","varies","rarely_wear"].map((id) => o(id,id.replaceAll("_"," "))) },
  { id: "q17_bags", chapter: 3, core: false, title: "Bag preferences", prompt: "What matters most in a bag for daily recommendations? Choose the most important first.", kind: "ranked", max: 3, rankMax: 3, options: ["hands_free","lightweight","laptop","daily_essentials","compact","structured","soft_relaxed","secure_closure","weather_resilient","statement","quiet_versatile","rarely_carry"].map((id) => o(id,id.replaceAll("_"," "))) },
  { id: "q18_branding", chapter: 4, core: false, title: "Visible branding and logos", prompt: "How do you feel about visible logos or recognizable branding?", kind: "single", options: ["avoid","discreet","selective","comfortable","depends","no_preference"].map((id) => o(id,id.replaceAll("_"," "))) },
  { id: "q19_trends", chapter: 4, core: false, title: "Trend tolerance", prompt: "When considering something current, which direction is more like you?", kind: "single", options: ["much_more_a","somewhat_more_a","equally_true","somewhat_more_b","much_more_b","depends"].map((id) => o(id,id.replaceAll("_"," "))) },
  { id: "q20_garment_roles", chapter: 3, core: false, title: "Garment roles by occasion", prompt: "Are there kinds of pieces you keep for particular parts of life?", kind: "matrix", rows: ["activewear","casual_basics","denim","tailoring","one_piece","occasionwear","outerwear","shoes","bags","accessories"].map((id) => o(id,id.replaceAll("_"," "))), options: ["reserved","often","sometimes","never","not_applicable"].map((id) => o(id,id.replaceAll("_"," "))) },
  { id: "q21_trusted_brands", chapter: 4, core: false, title: "Brands already trusted", prompt: "Are there brands you return to—and what tends to work?", kind: "text", maxLength: 2000 },
  { id: "q22_references", chapter: 4, core: false, title: "Aspirational brands or references", prompt: "Are there designers, people, places, films, or references whose point of view you admire?", kind: "text", maxLength: 2000 },
  { id: "q23_budget", chapter: 4, core: false, title: "Shopping comfort ranges", prompt: "If Curated helps with a future purchase, what ranges usually feel comfortable? This is used only by Personal Shopper.", kind: "text", maxLength: 2000 },
  { id: "q24_good_day", chapter: 4, core: false, title: "A note in your own words", prompt: "What does a very good dressing day feel like to you?", kind: "text", maxLength: 2000 },
];

export const CORE_STYLE_QUESTION_IDS = STYLE_SURVEY_QUESTIONS.filter((q) => q.core).map((q) => q.id);
export const STYLE_QUESTION_IDS = new Set(STYLE_SURVEY_QUESTIONS.map((q) => q.id));
export { STYLE_SURVEY_SCHEMA_VERSION };
