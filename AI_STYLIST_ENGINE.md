# Curated AI Stylist Engine

> **V2 authority notice — July 29, 2026:** This historical blueprint remains useful for principles and rationale, but is not the governing recommendation architecture. `RECOMMENDATION_QUALITY_ROADMAP.md` and approved `RECOMMENDATION_ARCHITECTURE_V2.md` govern. Existing deterministic rules and aggregate scores may survive only as subordinate evidence, validation, or diagnostics; they cannot select or rescue a recommendation.

## Status and purpose

This document defines how Curated should reason before any future AI stylist implementation begins. It is an architecture and product-decision blueprint only. It does not add prompts, models, database tables, scoring code, recommendation routes, or user-interface behavior.

The engine's purpose is not to name attractive clothing. Its purpose is to make a considered dressing decision from the user's real life, owned wardrobe, present conditions, practical constraints, preferences, and evolving style.

Every future Curated recommendation—Dress My Day, Travel, Personal Shopper, wardrobe-gap analysis, occasion dressing, and proactive styling—must follow the principles and decision order in this document.

## Core promise

Curated should answer:

> Given what this person is doing, where they are going, what conditions they will encounter, what they own, what is genuinely available, and how they want to feel, what is the most appropriate complete look—and why is it better than the alternatives today?

The engine must be:

- practical before performative;
- personal without being invasive;
- wardrobe-first rather than purchase-first;
- explainable rather than magical;
- confident only when evidence supports confidence;
- capable of restraint and uncertainty;
- respectful of rewearing, comfort, bodies, budgets, and personal change;
- deterministic where facts and rules are sufficient;
- AI-assisted only where interpretation and taste genuinely add value.

## Architectural position

```text
DailyAgenda + Weather + Travel context
                  │
User Profile + Preferences + Comfort goals
                  │
Wardrobe + Availability + Wear/Cost history
                  ↓
        Context and Constraint Resolver
                  ↓
       Eligible Wardrobe / Travel Closet
                  ↓
      Outfit Candidate Construction Layer
                  ↓
      Rules, Scoring, and AI Judgment Layer
                  ↓
      Validation, Confidence, Explanation
                  ↓
          Curated Recommendation Set
                  ↓
      User Choice, Correction, Wear Outcome
                  ↓
         Transparent Learning Signals
```

The stylist never calls a calendar provider directly. It consumes `DailyAgenda`, as defined in `CALENDAR_INTEGRATION.md`. Weather, travel, reservations, reminders, and future integrations must already be normalized into the agenda or a documented context contract before reaching the engine.

## Non-goals

The engine must not:

- invent garments, colors, sizes, brands, materials, availability, purchase prices, or wear history;
- recommend an item known to be in laundry, repair, storage, loaned out, packed elsewhere, or otherwise unavailable;
- use body measurements to judge attractiveness, worth, or what a user “should” hide;
- infer protected or sensitive traits from names, locations, photos, measurements, or agenda entries;
- treat a single choice, skipped suggestion, or unusual week as a permanent preference;
- discourage reasonable rewearing or frame repeated use as failure;
- optimize for novelty, purchasing, trend adherence, or visible expense;
- call an aspirational outfit practical when it conflicts with weather, walking, comfort, or logistics;
- expose private agenda, measurements, cost, or behavioral history in an explanation unnecessarily;
- substitute AI confidence for missing evidence.

## Input contracts

The decision engine accepts normalized, user-owned inputs. Each input carries freshness, source, and confidence where applicable.

### DailyAgenda

The agenda is the source of truth for the shape of the day:

- date and user timezone;
- timed and all-day items;
- meeting, dinner, travel, flight, workout, social, wedding, vacation, appointment, and other kinds;
- start/end time and transitions between events;
- location and indoor/outdoor confidence;
- explicit or inferred occasion and dress code;
- read-only source information only when needed for user disclosure.

The engine evaluates both the target agenda item and the surrounding day. A dinner recommendation may need to account for a prior office meeting; a flight look may need to work upon arrival; a wedding may justify a complete change.

### Weather

Styling-relevant weather context includes:

- current, departure-time, event-time, and return-time temperature when available;
- daily high/low and meaningful temperature change;
- apparent temperature;
- precipitation probability and type;
- wind;
- humidity only when it materially affects comfort or fabric choice;
- indoor/outdoor exposure and time outside;
- weather location and freshness.

Weather is evidence, not season. An unusually warm winter day remains winter context but should be dressed for actual conditions.

### User wardrobe

Each garment record should provide only known data:

- unique owned-item ID;
- department, category, and subcategory;
- item name and brand when known;
- color and optional pattern/material when known;
- season tags;
- size and fit notes when supplied;
- favorite status;
- formality/occasion suitability when confirmed or inferred;
- warmth, water tolerance, mobility, comfort, and walkability attributes when confirmed or cautiously inferred;
- outfit compatibility or known combinations;
- current availability state;
- wear statistics and most recent wear;
- cost and cost-per-wear only when the user supplied enough data.

Unknown attributes remain unknown. They are not silently filled by the language model.

### Laundry and availability

Every item should resolve to one of:

- `available`;
- `laundry`;
- `repair`;
- `packed`;
- `storage`;
- `loaned`;
- `reserved` for a later plan;
- `unknown`.

Known unavailable states are hard exclusions. `Unknown` is not the same as unavailable; the engine may use it but should lower operational confidence or ask for confirmation when the item is central to the recommendation.

Availability must be evaluated at the time the outfit is needed, not only at recommendation time. An item planned for laundry before an event can be treated as conditionally available only if the user explicitly confirms that plan.

### Travel context

Travel narrows the eligible wardrobe to the user's confirmed travel closet when packing data exists. It includes:

- destination and relevant timezone;
- departure, transit, arrival, and itinerary segments;
- packed items and footwear;
- luggage limits;
- laundry access;
- repeat-wear tolerance;
- climate and cultural/formality context explicitly supplied or safely sourced;
- planned outfit changes and access to luggage during transit.

The engine must not recommend an item left at home simply because it exists in the full wardrobe.

### Season

Season contributes:

- calendar season in the relevant location;
- garment season tags;
- fabric and color expectations only as soft signals;
- holiday or cultural context only when explicitly present and appropriate.

Actual weather and user comfort override conventional seasonal rules. Season should never prohibit white, color, texture, or a silhouette by tradition alone.

### Dress code and formality

Dress-code evidence may be:

1. explicit user-entered instructions;
2. explicit reservation/invitation data provided with permission;
3. high-confidence agenda text;
4. venue/time/occasion inference;
5. unknown.

Explicit requirements always outrank inference. Inferred dress codes must be labeled as inferred, retain confidence, and remain user-correctable.

### User preferences

Separate preference types:

- explicit current preferences;
- confirmed long-term preferences;
- contextual preferences, such as “comfortable shoes on travel days”;
- learned tendencies with confidence and timestamp;
- temporary intent for today, such as “I want to feel bold.”

Explicit current intent has priority. Learned preference is advisory and must not trap the user in an old aesthetic.

### Outfit history and item wear frequency

History should capture:

- confirmed worn outfits and dates;
- agenda kind/occasion at wear time;
- linked item IDs;
- exact-outfit and partial-outfit repetition;
- item wear count and recent frequency;
- recommendation accepted, rejected, modified, or ignored;
- user comments about comfort, confidence, fit, or appropriateness.

Only confirmed wear updates wear counts. A generated or viewed recommendation is not a wear.

### Cost per wear

Cost per wear is calculated only when both purchase cost and confirmed wear count are known:

> cost per wear = user-provided acquisition cost ÷ confirmed wears

Rules:

- never invent price;
- never treat high original cost as proof of quality or appropriateness;
- never pressure a user to wear an unsuitable item merely to lower cost per wear;
- use cost per wear as a small wardrobe-utility signal after occasion, weather, comfort, and preference;
- surface it only when useful and never shame the user about spending.

### Comfort and confidence

Comfort and confidence are distinct user-centered signals.

Comfort may include:

- temperature sensitivity;
- fabric sensitivity;
- mobility needs;
- heel tolerance and shoe walkability;
- preferred coverage;
- sitting, standing, bending, commuting, or carrying needs;
- fit observations explicitly supplied by the user.

Confidence means how the user reports feeling in an item or silhouette—not an AI judgment about their appearance. It may be contextual: a suit can feel highly confident for a presentation and overly formal for a relaxed lunch.

### Color harmony

Color evaluation considers:

- relationships among garment colors;
- user's confirmed favorite and avoided colors;
- pattern scale and visual competition;
- tonal, analogous, complementary, neutral, or intentional contrast strategies;
- day-to-evening and lighting context;
- season only as a soft editorial cue;
- color confidence based on actual item metadata/photo quality.

The engine should prefer an intentional palette, not a universal formula. “Matching” is not always harmony, and bold contrast is not automatically disharmony.

## Context interpretation questions

Before considering garments, the engine resolves the following questions and assigns confidence to each answer.

### Occasion

- What is the target agenda item?
- Is it a meeting, dinner, travel segment, flight, workout, social event, wedding, vacation plan, appointment, or other occasion?
- Is it the only event or one transition within a longer day?
- Is this routine, celebratory, professional, ceremonial, active, intimate, public-facing, or uncertain?

### Formality

- Is there an explicit dress code?
- What is the minimum acceptable formality?
- Is overdressing materially uncomfortable or socially mismatched?
- Does the user prefer a more polished or relaxed interpretation?
- Is the inferred formality reliable enough to act upon?

### Environment

- Is the event indoors, outdoors, mixed, or unknown?
- Is the venue climate controlled?
- Is there meaningful exposure while commuting, waiting, dining outside, or moving between locations?
- Does the location suggest terrain, security, cultural, or venue constraints that are explicit and appropriate to use?

### Movement and footwear

- How far is the user likely to walk?
- Will they stand for long periods?
- Are stairs, uneven surfaces, airport terminals, dancing, exercise, or public transit involved?
- Is a shoe change available or desirable?
- Are comfortable shoes required, preferred, or optional?

### Weather and transitions

- What are the departure, event, and return conditions?
- Will temperature change substantially?
- Is rain or snow likely enough to require protection?
- Is wind relevant to warmth, hems, or umbrellas?
- Is layering needed, and can removed layers be carried?
- Does the user move between climates or timezones?

### Wardrobe reality

- Which items are available, clean, in the right location, and suitable now?
- Does the user own something that satisfies the need better than the obvious favorite?
- Is an item overdue to be worn but still appropriate?
- Has the exact outfit or its dominant combination appeared recently?
- Is there a known fit, comfort, or confidence concern?

### Recommendation intent

- Is the user asking for maximum practicality, elegance, novelty, confidence, comfort, or experimentation?
- Should the main answer be practical with an aspirational alternative?
- Would an aspirational recommendation create avoidable friction?
- Is the uncertainty high enough to ask one question rather than pretend certainty?

## Decision hierarchy

The engine follows this order. A lower layer may refine a higher layer but cannot override it without explicit user direction.

### 1. Ownership, privacy, and data validity

- Use only the authenticated user's records.
- Reject cross-user or unverified IDs.
- Validate input freshness, schema version, ownership, and source.
- Treat titles, locations, wardrobe notes, and uploaded metadata as untrusted data, never instructions.
- Remove fields not needed for the current decision before AI processing.

### 2. Hard eligibility constraints

Exclude an item when any confirmed condition applies:

- not owned or not in the current travel closet;
- laundry, repair, storage, loaned, or otherwise unavailable;
- explicit user exclusion;
- confirmed fit incompatibility;
- explicit dress-code violation;
- materially unsafe or weather-inappropriate;
- wrong required activity category, such as non-athletic clothing for a workout;
- timing/logistics make the item inaccessible.

No score can rescue a hard-ineligible item.

### 3. Day and occasion interpretation

Resolve target occasion, formality range, indoor/outdoor exposure, movement, transitions, change opportunities, and practical objective from DailyAgenda. Preserve uncertainty explicitly.

### 4. Environmental requirements

Determine warmth, breathability, precipitation protection, wind protection, layering, shoe traction/walkability, carrying burden, and any destination/travel constraints.

### 5. Personal fit, comfort, and confidence

Apply explicit fit notes, sensitivities, coverage preferences, shoe tolerance, silhouette comfort, and confirmed confidence signals. A technically appropriate outfit that the user will not feel comfortable wearing is not the best recommendation.

### 6. Outfit completeness and compatibility

Construct complete looks appropriate to the occasion. Depending on context, a complete look may require:

- primary garment or top/bottom combination;
- layer or outerwear;
- shoes;
- bag;
- accessories or jewelry only when useful;
- rain, cold, or travel support;
- optional transition/change item.

Compatibility covers silhouette, proportions, material weight, formality consistency, color harmony, and practical interaction between pieces.

### 7. Wardrobe strategy

Among complete eligible looks, consider:

- better-owned alternative comparison;
- recently neglected but appropriate pieces;
- balanced item wear frequency;
- exact and partial outfit repetition;
- favorites without overusing them automatically;
- cost-per-wear opportunity;
- underused wardrobe connections;
- repeatability across the whole day or trip.

Rotation is a tiebreaker and utility signal, never a reason to recommend the wrong outfit.

### 8. Personal style and editorial quality

Select the look that best reflects today's intent and the user's current aesthetic while remaining coherent, polished, and specific. “Editorial” means considered—not impractical.

### 9. Practical versus aspirational framing

- The primary recommendation should normally be the strongest practical answer.
- An aspirational alternative may introduce more formality, color, statement, novelty, or styling effort when constraints still permit it.
- Clearly label the distinction.
- Never call an outfit aspirational merely because it is expensive, designer, less comfortable, or trend-led.

### 10. Validation and confidence

Recheck every item, constraint, source, and rationale. If confidence is too low, return a cautious recommendation, alternatives, or a focused question rather than fabricated certainty.

## Candidate construction

The engine should not ask a language model to search the entire wardrobe freely.

### Wardrobe eligibility set

First create an eligible set through deterministic filters:

- user and location ownership;
- availability/laundry state;
- category needs;
- event formality range;
- temperature/weather range;
- activity/mobility requirements;
- season as a soft filter unless conditions make it decisive;
- explicit preferences and exclusions.

### Outfit templates

Use occasion-appropriate templates to avoid incomplete or incoherent looks. Examples:

- meeting: dress + layer + shoes + bag;
- meeting: top + trousers/skirt + optional blazer + shoes;
- dinner: dress/jumpsuit or elevated separates + shoes + layer if needed;
- flight: comfortable base + layer + walkable shoes + accessible outerwear;
- workout: activity top + bottom + athletic shoes + transition layer;
- wedding: ceremony-appropriate primary look + shoes + bag + weather layer;
- travel day: repeatable capsule combination with luggage-aware accessories.

Templates are adaptable by wardrobe department, gender expression, user style, climate, and preference. They are not rigid gender rules.

### Candidate diversity

Generate a small set of materially different candidates, not cosmetic variants:

1. strongest practical look;
2. strongest style-forward/aspirational eligible look;
3. strongest rotation/wardrobe-utility look when sufficiently different.

Candidates should use real owned item IDs. The system must compare them head-to-head before selecting the primary recommendation.

## Scoring model

Scoring ranks candidates only after hard eligibility. It should be versioned, logged as factor summaries, and calibrated against user outcomes.

### Base score: 100 points

| Factor | Default weight | What it measures |
| --- | ---: | --- |
| Occasion and formality fit | 18 | Suitability for the agenda item and explicit/inferred dress code. |
| Weather and environmental fit | 15 | Temperature, rain, wind, indoor/outdoor exposure, layering. |
| Comfort and mobility | 14 | Walking, standing, sitting, activity, shoe tolerance, carrying layers. |
| Outfit completeness and compatibility | 13 | Required categories, silhouette, materials, formality consistency. |
| Explicit user preference and today's intent | 12 | Current stated desire, confirmed preferences, exclusions. |
| Fit and confidence | 10 | Confirmed fit suitability and contextual confidence signals. |
| Color harmony | 7 | Intentional palette and pattern relationships with evidence quality. |
| Wear rotation and recency | 5 | Avoid stale repetition while respecting rewearing and overlooked items. |
| Wardrobe utility and cost per wear | 3 | Appropriate use of owned investment/underused items when data exists. |
| Day/travel versatility | 3 | Ability to handle transitions, repeat, packing, or limited changes. |
| **Total** | **100** |  |

Weights vary by context within governed limits:

- workout increases activity/comfort weight;
- wedding increases dress-code/formality weight;
- flight increases comfort, layering, and travel versatility;
- severe weather increases environmental weight;
- explicit “I want to experiment” increases today's-intent/editorial weight only after constraints pass.

Missing data does not produce a zero. Redistribute that factor's weight proportionally among known relevant factors and lower confidence. For example, unknown purchase cost removes cost-per-wear scoring rather than penalizing the item.

### Factor scoring

Each factor receives:

- a normalized score from 0 to 1;
- evidence confidence from 0 to 1;
- a short reason code;
- supporting source (`explicit`, `confirmed history`, `derived rule`, `AI inference`, `unknown`).

Conceptually:

> contribution = normalized factor score × applicable weight × evidence confidence adjustment

The final score is useful for ranking, not an objective truth or a user-facing grade.

### Penalties and bonuses

Hard exclusions occur before scoring. Soft adjustments are capped so they cannot overpower occasion, safety, or comfort.

Possible capped penalties:

- exact outfit worn very recently when alternatives are equally good;
- dominant two-piece combination repeated recently;
- uncertain availability;
- uncertain fit or weather compatibility;
- unnecessary shoe/layer change burden;
- color or formality conflict;
- aspirational friction inconsistent with user intent.

Possible capped bonuses:

- appropriate item significantly overdue for wear;
- confirmed favorite in a context where it works especially well;
- strong cost-per-wear opportunity with complete data;
- versatile look that covers multiple agenda transitions;
- known high-comfort or high-confidence combination;
- creates a useful outfit around an otherwise isolated owned piece.

“Overdue” is relative to category, season, availability, ownership duration, and the user's number of occasions. A gala dress is not overdue on the same cadence as work trousers.

### Repetition policy

- Rewearing is positive and normal.
- Exact-outfit recency is a diversity signal, not a prohibition.
- A recently repeated outfit can still win when it is clearly best, the wardrobe is limited, the user favors uniforms, travel requires repetition, or laundry reduces options.
- Explain repetition positively when relevant: “This remains your strongest rain-ready combination.”
- Never mention repetition if doing so would feel judgmental or add no value.

### “Does the user own something better?” comparator

Before finalizing, run a challenger pass:

1. Identify the weakest factor in the leading candidate.
2. Search the eligible wardrobe for a replacement that improves that factor.
3. Rebuild and rescore the look.
4. Keep the challenger only if it materially improves the full outfit rather than one isolated item.
5. Stop after a bounded number of challengers.

This prevents the first plausible outfit from becoming the answer.

## Confidence model

Recommendation confidence is separate from outfit score. A high-scoring candidate built on uncertain data should not be presented with high confidence.

### Confidence dimensions

| Dimension | Evidence |
| --- | --- |
| Agenda confidence | Occasion, timing, location, formality, indoor/outdoor understanding. |
| Weather confidence | Forecast freshness, location match, event-time coverage. |
| Wardrobe confidence | Metadata completeness, photo quality, category/color/season accuracy. |
| Availability confidence | Laundry/travel/location status and freshness. |
| Fit/comfort confidence | Explicit notes and confirmed wear feedback. |
| Preference confidence | Explicit current input versus inferred historical tendency. |
| Outfit compatibility confidence | Confirmed prior combination versus inferred coordination. |

### Confidence levels

- **High:** hard constraints are known; occasion/weather/availability are clear; core items have reliable metadata; recommendation rests mainly on explicit or confirmed evidence.
- **Medium:** recommendation is strong but one meaningful area is inferred or incomplete, such as venue formality, walking distance, or a layer's warmth.
- **Low:** agenda meaning, weather, availability, fit, or wardrobe metadata is materially incomplete; the engine should ask a question or present a provisional option.

The lowest critical dimension may cap overall confidence. For example, excellent wardrobe data cannot create high confidence when a wedding dress code is unknown.

### Confidence behavior

- High confidence: give one clear primary answer and an optional alternative.
- Medium confidence: state the assumption briefly and offer an easy adjustment.
- Low confidence: ask one focused question when possible; otherwise provide a cautious baseline and say what would change it.
- Never display a false numeric precision such as “93% confident” unless calibration proves that number meaningful.

## Rules versus AI boundaries

### Deterministic rules own

- authentication and ownership;
- availability and laundry exclusions;
- travel-closet membership;
- explicit user exclusions;
- required categories and outfit completeness;
- explicit dress-code rules;
- weather thresholds and precipitation protection;
- time, timezone, agenda transitions, and walking inputs;
- exact outfit/item recency;
- wear counts and cost-per-wear arithmetic;
- scoring weights, caps, and missing-data redistribution;
- allowed item IDs and output schema validation;
- privacy minimization and retention;
- final hard-constraint validation.

### AI may assist with

- ambiguous occasion interpretation from normalized agenda text;
- nuanced formality within a rule-defined range;
- silhouette and material compatibility when metadata supports it;
- color-harmony judgment;
- constructing a small number of candidates from a prefiltered eligible set;
- distinguishing practical and aspirational styling approaches;
- concise, warm explanations;
- detecting potential preference evolution from repeated signals, subject to confirmation.

### AI must never control

- whether an unavailable item is eligible;
- whether a provider token or private field is exposed;
- ownership or authorization;
- factual weather, walking distance, cost, inventory, or wear history;
- body-value judgments or inferred measurements;
- permanent preference changes without user confirmation;
- database writes outside validated application services;
- final item IDs not present in the eligible candidate set.

### Hybrid decision pattern

1. Rules establish facts, constraints, eligible items, and score boundaries.
2. AI interprets ambiguity and proposes structured candidates using only eligible IDs.
3. Rules validate, score, compare, and reject invalid candidates.
4. AI may write the explanation from approved facts.
5. A final validator confirms every explanation claim is supported.

AI proposes; Curated's governed engine decides.

## Recommendation pipeline

### Stage 1 — Request and consent boundary

- Authenticate user.
- Load only relevant user-owned data.
- Confirm permission for agenda, profile, measurements, cost, and learning signals used.
- Record request target, timezone, schema, and engine version.

### Stage 2 — Build the decision context

- Select target DailyAgenda item.
- Include only relevant surrounding agenda transitions.
- Resolve occasion, formality, indoor/outdoor, walking, activity, change opportunity, and practical/aspirational intent.
- Attach event-time weather and travel context.
- Identify missing critical facts.

### Stage 3 — Decide whether to ask

Ask at most one high-value question when its answer could change the recommendation materially, for example:

- “Is the wedding black tie?”
- “Will you be walking between the meeting and dinner?”
- “Are the loafers currently available?”

Do not interrogate the user for low-impact details. Provide a sensible assumption when the decision remains robust.

### Stage 4 — Resolve wardrobe availability

- Choose home wardrobe or travel closet.
- Apply laundry/availability and timing.
- Remove explicit exclusions and confirmed fit failures.
- Produce an auditable eligible item set.

### Stage 5 — Generate outfit candidates

- Choose occasion templates.
- Build complete looks from eligible IDs.
- Produce practical, aspirational, and rotation candidates when enough variation exists.
- Avoid redundant near-duplicates.

### Stage 6 — Score and challenge

- Apply contextual weights.
- Score every factor with evidence confidence.
- Apply capped bonuses/penalties.
- Run “something better” challenger pass.
- Rank candidates and calculate recommendation confidence.

### Stage 7 — Validate

For every selected candidate verify:

- every item exists, belongs to the user, and is eligible;
- outfit is complete for the context;
- no explicit rule or preference is violated;
- weather, footwear, and layering claims are supported;
- dress-code/formality statements are explicit or labeled inferred;
- cost/wear/history claims are calculated from confirmed data;
- color and style claims do not overstate metadata confidence;
- explanation contains no unnecessary private detail.

Invalid candidates are rejected, not repaired through prose.

### Stage 8 — Produce the recommendation set

The response should contain:

- one primary complete outfit with owned item IDs;
- concise “why this works” reasoning across occasion, weather, comfort, and personal style;
- practical instructions such as layer, umbrella, or shoe-change guidance when relevant;
- confidence level and one brief assumption when needed;
- one materially different alternative when useful;
- a clearly labeled aspirational alternative only when it remains eligible;
- one focused question if confidence is too low.

### Stage 9 — Capture outcome

Track what the user explicitly does:

- accepts recommendation;
- requests another option;
- replaces/removes an item;
- marks outfit as worn;
- reports comfort, confidence, fit, weather, or appropriateness;
- saves to Style Archive;
- rejects with a reason;
- ignores/dismisses.

Only explicit or strongly evidenced actions should update durable learning signals.

## Recommendation explanation standard

Curated's explanation should sound like a perceptive private stylist, not a scoring report.

Good explanation structure:

1. Name the look clearly.
2. Explain occasion/formality fit.
3. Explain environmental and movement practicality.
4. Mention one personal or wardrobe reason.
5. State an assumption or optional adjustment if confidence is not high.

Example tone:

> The navy trousers, ivory silk blouse, and soft-shouldered blazer give you enough authority for the presentation without feeling rigid through dinner. The loafers are the stronger choice today because of the walk between venues, and the trench handles the cooler, wet return.

Avoid:

- “This hides your problem areas.”
- “You always wear black.”
- “You need to get more use from this expensive coat.”
- “This is definitely the venue's dress code” when inferred.
- generic language that could describe any wardrobe.

## Practical and aspirational recommendations

### Practical

A practical recommendation optimizes for real execution:

- weather and walking;
- availability and laundry;
- fit and known comfort;
- agenda transitions;
- dress-code sufficiency;
- low carrying/change burden;
- repeatability during travel.

Practical does not mean plain or less stylish.

### Aspirational

An aspirational recommendation may intentionally increase:

- statement color or pattern;
- formality within the acceptable range;
- a less familiar silhouette;
- accessories or styling effort;
- novelty or creative contrast.

It must still pass safety, availability, dress code, weather, and user-boundary checks. Aspirational means expressive, not unrealistic.

### Selection rule

Primary defaults to practical unless:

- the user explicitly requests experimentation or impact;
- the occasion rewards an expressive choice;
- the aspirational look is equally practical;
- confirmed history shows the user prefers the bolder interpretation in this context.

## User feedback loop

### Signal strength

| User action | Default signal strength | Interpretation |
| --- | --- | --- |
| Explicit preference/correction | Very strong | Apply immediately within stated scope. |
| Marks outfit worn | Strong | Confirms actual wear, not necessarily full satisfaction. |
| Reports “felt confident/comfortable” | Strong | Context-specific positive signal. |
| Reports fit/comfort problem | Very strong | Update item/context constraint after confirmation. |
| Saves to Style Archive | Strong | Confirmed aesthetic signal. |
| Replaces one recommended item | Medium | Preference or constraint clue; ask/observe why. |
| Requests another option | Weak/medium | Current answer missed; reason is unknown without feedback. |
| Repeatedly declines similar looks | Medium after repetition | Candidate preference shift, not proof. |
| Views or ignores a recommendation | Very weak | Do not infer dislike. |

### Feedback prompts

Keep prompts optional and concise:

- “What would you change?”
- “Was the formality right?”
- “Were the shoes comfortable enough?”
- “Did you feel like yourself?”
- “Was this more practical or more polished than you wanted?”

Do not request feedback after every action. Sample at useful moments and let behavior remain quiet.

### Correction precedence

1. Current explicit instruction.
2. Item-specific confirmed constraint.
3. Context-specific confirmed preference.
4. Current general profile preference.
5. High-confidence learned preference.
6. Low/medium learned tendency.
7. Generic styling prior.

## Future learning model

### Separate data classes

Maintain distinct stores for:

- explicit preferences;
- item facts and availability;
- confirmed wears;
- recommendation outcomes;
- observed signals;
- inferred preferences;
- engine evaluation/calibration data.

Do not collapse these into opaque “AI memory.”

### Learned preference shape

Every inferred preference should have:

- subject and value, such as `footwear:walkable`;
- context, such as `workday_with_transit`;
- supporting signal count;
- positive and negative evidence;
- confidence;
- first and most recent observation;
- decay/expiry policy;
- explanation suitable for user review;
- status: proposed, confirmed, dismissed, expired.

### Learning progression

1. Observe a user-controlled outcome.
2. Record a narrow context-specific signal.
3. Aggregate repeated compatible signals.
4. Propose an inference with confidence.
5. Apply softly and selectively.
6. Explain when it affects a recommendation.
7. Invite confirmation or correction.
8. Decay when behavior changes or evidence becomes old.

### Avoiding feedback loops

If Curated repeatedly recommends the same style, it will create biased wear data. Countermeasures:

- reserve modest candidate diversity;
- distinguish “recommended by Curated” from independent user choice;
- do not count exposure as preference;
- periodically test equally eligible alternatives;
- cap learned-preference influence;
- let explicit style-evolution goals override history;
- audit whether certain categories/colors disappear from candidate sets unfairly.

### Personal style evolution

Learned preferences are time-aware. Recent evidence may outweigh older evidence, but history is not erased. Curated should recognize changes with language such as:

> You have been choosing relaxed tailoring more often for client days. Would you like me to make that a current preference?

Never announce a style identity as fact without confirmation.

## Decision records and explainability

For a recommendation the system may retain a compact, versioned decision record containing:

- user ID and recommendation ID;
- DailyAgenda item ID or minimal agenda snapshot;
- engine/rules/model versions;
- eligible selected item IDs;
- hard constraints applied;
- factor score bands and reason codes;
- confidence dimensions;
- selected candidate and alternative IDs;
- user outcome when explicitly recorded.

Do not retain:

- raw provider payloads;
- unnecessary agenda history;
- hidden chain-of-thought;
- full prompts containing excessive private data;
- speculative sensitive inferences;
- provider tokens or credentials.

Explainability means traceable inputs, reason codes, validated claims, and concise user-facing rationale—not storing private internal reasoning prose.

## Handling missing data

The engine must work with an incomplete wardrobe and profile.

### Missing agenda detail

- Infer cautiously from known fields.
- Ask one question only when decision-changing.
- Otherwise provide a flexible baseline.

### Missing weather

- Do not claim conditions.
- Recommend an adaptable layer when season/location justify it cautiously.
- Label weather-dependent advice as conditional.

### Missing garment attributes

- Use reliable category/color/photo evidence only.
- Avoid material/warmth/formality claims when unknown.
- Prefer candidates with sufficient metadata when otherwise equal.

### Missing availability

- Present critical unknown items as “if available” or ask for confirmation.
- Never mark them unavailable without evidence.

### Small wardrobe

- Rewear confidently.
- Reduce diversity and rotation expectations.
- Build the strongest complete look possible.
- Do not turn Dress My Day into a shopping prompt.

## Special decision patterns

### Full day with multiple occasions

Optimize the day, not isolated events:

- find a base outfit spanning the dominant contexts;
- add/remove layers and accessories;
- recommend one change item only when the improvement justifies logistics;
- account for storage and carrying;
- avoid contradictory recommendations for adjacent events.

### Flight and arrival

- prioritize movement, temperature variation, security practicality, and walkability;
- consider access to luggage and arrival plans;
- avoid easily lost or cumbersome items;
- suggest an arrival adjustment rather than a full change when possible.

### Workout transition

- distinguish dressing for the workout from dressing around it;
- account for shower/change opportunity;
- do not reuse clothing in a way that conflicts with hygiene or user preference;
- ensure active footwear and support are genuinely available.

### Wedding or formal event

- explicit dress code dominates;
- weather, ceremony/reception location, walking, and duration matter;
- confidence remains limited when formality is inferred;
- do not infer cultural or religious requirements without explicit context;
- recommend owned formalwear before shopping.

### Rain and uncertain precipitation

- use probability, duration, exposure, and consequence;
- protect delicate footwear/materials when risk is meaningful;
- avoid overreacting to low-risk brief exposure;
- offer a rain-safe swap when it preserves the look.

### Overdue item

- confirm it is seasonally and contextually appropriate;
- compare against category-specific wear cadence;
- inspect whether low wear may signal discomfort or poor fit;
- offer it as a candidate, not an obligation.

## Safety, fairness, and dignity

- Never recommend based on changing a person's body or conforming to a body ideal.
- Measurements and sex/profile selection support fit and garment taxonomy only.
- Do not assume gender expression from registration choice, wardrobe department, name, or event.
- Avoid moral judgments about modesty, spending, repetition, weight, age, or trend relevance.
- Accessibility and mobility preferences are first-class constraints when supplied.
- Cultural/formality guidance must be sourced or explicitly provided, not stereotyped.
- Confidence language should acknowledge uncertainty without making the user feel at fault for incomplete data.

## Privacy and data minimization

- Process recommendations server-side for the authenticated user.
- Retrieve only the target agenda item, relevant transitions, eligible wardrobe fields, required profile preferences, weather, and bounded history.
- Do not send provider/calendar identifiers, private tokens, unrelated events, exact purchase costs, body measurements, or raw photos to the language model unless a separately consented feature requires them.
- Prefer derived fit/comfort constraints over raw measurements in styling prompts.
- Treat agenda titles and locations as potentially sensitive.
- Give users controls to disable learning, clear inferred preferences, delete recommendation history, and disconnect context sources.

## Evaluation and testing blueprint

### Rule tests

Test hard exclusions and objective behavior for:

- ownership and cross-user isolation;
- laundry/repair/travel availability;
- explicit dress codes;
- weather thresholds and layering;
- walking and footwear;
- schedule transitions;
- confirmed fit constraints;
- exact/partial repetition;
- wear counts and cost-per-wear math;
- missing-data weight redistribution.

### Scenario tests

Maintain synthetic wardrobes and expected decision bands for:

- rainy client meeting with a long walk;
- office-to-dinner transition;
- hot outdoor wedding with unclear formality;
- winter flight into a warm destination;
- workout before a professional appointment;
- vacation day with limited packed pieces;
- formal event with no known dress code;
- small wardrobe with recent repetition;
- favorite shoes in laundry;
- underused item that is wrong for the occasion;
- aspirational request under practical constraints;
- incomplete weather and item metadata.

Do not require one exact outfit when several are valid. Assert eligibility, factor ranges, required items, prohibited items, explanation truth, and confidence behavior.

### AI contract tests

- Only eligible owned IDs may be returned.
- Structured output must validate.
- Prompt-injection text in agenda/item names is ignored.
- Missing facts remain missing.
- Inferred dress codes are labeled and confidence-bounded.
- Explanations contain only approved facts.
- Sensitive body or agenda inferences are rejected.
- Model failure falls back to deterministic candidates or a graceful explanation.

### Calibration metrics

Measure without optimizing blindly:

- recommendation accepted and worn;
- alternative requested;
- item substitution rate;
- comfort/confidence/formality feedback;
- rule-violation rate (must approach zero);
- unavailable-item recommendation rate (must be zero when status is known);
- explanation factuality;
- confidence calibration;
- wardrobe diversity by context;
- repetition appropriateness;
- user-confirmed preference accuracy.

Acceptance rate alone is insufficient; easy repetitive recommendations may be accepted while failing the product's purpose.

## Governance and versioning

Version independently:

- context schema;
- eligibility rules;
- outfit templates;
- factor weights and caps;
- classification/enrichment model;
- candidate-generation model/prompt;
- explanation model/prompt;
- confidence calibration;
- learning aggregation rules.

Every change should be evaluated against a stable synthetic scenario suite and, when appropriate, an opt-in shadow evaluation. Do not silently change permanent preferences or reinterpret prior decisions using a new model.

High-impact changes require review for privacy, bias, comfort, body dignity, and whether AI is taking authority that belongs in deterministic rules.

## Phased implementation blueprint

### Phase 0 — deterministic foundation

1. Approve input contracts, eligibility states, context taxonomy, and privacy boundary.
2. Add DailyAgenda consumption boundary.
3. Define wardrobe availability/laundry status.
4. Define outfit templates and completeness rules.
5. Implement factor calculations, confidence inputs, and decision records without AI candidate generation.
6. Build synthetic scenario and authorization tests.

### Phase 1 — governed Dress My Day engine

1. Add rule-based occasion/formality/weather/mobility resolution.
2. Construct deterministic eligible pools and baseline candidates.
3. Add structured AI candidate construction from eligible IDs only.
4. Validate, score, challenge, and explain approved candidates.
5. Add practical primary and optional aspirational alternative.
6. Persist compact decision snapshot and explicit outcomes.

### Phase 2 — feedback and wardrobe intelligence

1. Add laundry/availability controls and freshness.
2. Add confirmed wear frequency, recency, and exact/partial repetition.
3. Add comfort, confidence, and fit feedback.
4. Add optional acquisition cost and cost-per-wear.
5. Add transparent user-reviewable inferred preferences.

### Phase 3 — multi-event, travel, and transition intelligence

1. Optimize across the full DailyAgenda.
2. Add travel closet, packed availability, luggage, and laundry context.
3. Add flight, workout, wedding, vacation, reservation, and complex transition policies.
4. Coordinate weather by event time/location.

### Phase 4 — long-term learning and calibration

1. Add contextual preference aggregation and confidence decay.
2. Add style-evolution proposals and user confirmation.
3. Calibrate recommendation confidence against actual outcomes.
4. Audit feedback loops, category/color exposure, and over-recommendation of favorites.
5. Extend the governed engine to Travel and Personal Shopper without bypassing its constraints.

## Definition of a successful recommendation

A Curated recommendation succeeds when:

- every item is owned, available, and appropriate;
- the complete look fits the occasion and formality;
- weather, walking, transitions, and comfort are addressed;
- the user can understand why this look won;
- the answer feels personal without revealing invasive reasoning;
- repetition and wardrobe utility are handled intelligently;
- color and silhouette feel intentional;
- practical and aspirational intent are represented honestly;
- uncertainty is acknowledged;
- the user remains in control of correction and learning;
- the engine would make the same decision from the same governed evidence, regardless of which calendar or future integration supplied the agenda.

Curated should feel less like an AI choosing clothes and more like an exceptionally prepared stylist who has listened carefully, checked every practical detail, considered the wardrobe as a whole, and knows when to be decisive—and when to ask.
