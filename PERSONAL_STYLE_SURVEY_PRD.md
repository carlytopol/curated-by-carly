# Personal Style Profile Survey — Product Requirements Document

**Status:** Approved for Engineering  
**Owner:** Chief Product Officer  
**Date:** July 28, 2026  
**Product surface:** Profile / The Study  
**Implementation:** Not included in this document

## 1. Executive decision

**Decision: Approve.**

Curated should introduce a Personal Style Profile Survey as an optional, editable consultation under Profile. Its customer-facing working title is **Your Style Notes**. It creates a structured, user-owned record that Dress My Day, Personal Shopper, Packing, and future governed recommendations can reference without relying on stereotypes, opaque AI memory, or a long interrogation at the moment of need.

The survey is not a style quiz and produces no archetype, score, body classification, taste judgment, or shareable label. It does not tell the customer who she is. It records how she prefers to dress, what practical boundaries matter, how those preferences change by occasion, and where she wants Curated to use judgment.

The minimum viable survey is **14 core questions**. This is the smallest set that gives the recommendation engine meaningful evidence across intent, occasion, silhouette, fit, color, comfort, footwear, weather, expression, and wardrobe priorities. Ten optional refinements deepen fabrics, brands, budget, accessories, bags, garment roles, and shopping context. The core path should take approximately **5–6 minutes**; a thoughtful full completion should take **8–10 minutes**.

## 2. Source-of-truth review

This PRD was prepared after reviewing:

- `BRAND_BIBLE.md`
- `USER_PROFILE_SYSTEM.md`
- `PERSONAL_SHOPPER.md`
- `AI_STYLIST_ENGINE.md`
- `DRESS_MY_DAY_V1_PRD.md`

The survey must preserve these existing decisions:

- Curated is a private style house, not a personality quiz, inventory system, marketplace, or generic AI assistant.
- Explicit profile answers, observed behavior, inferred preferences, recommendation history, garment facts, and confirmed wear outcomes remain separate data classes.
- A recommendation must work with an incomplete profile. The survey is never an account-creation gate or a prerequisite for Dress My Day.
- Current explicit intent outranks profile history. Confirmed item/context constraints outrank general preferences.
- Beauty cannot override ownership, availability, weather, walking, dress code, comfort, accessibility, or fit.
- Personal Shopper begins with the owned wardrobe and must remain capable of `Wait` or `Pass`.
- Recommendations use governed rules, scoring, confidence, and validation; survey answers do not become a replacement prompt.
- Style evolves. New evidence may propose a change, but cannot silently overwrite an explicit answer.

## 3. Product purpose and success

### Purpose

Create a structured, user-specific style model that helps Curated make more relevant, restrained, explainable decisions across:

- Dress My Day;
- Personal Shopper;
- Packing;
- wardrobe editing and future seasonal reflection;
- future recommendations that are explicitly approved to consume profile data.

### Customer promise

> Tell Curated what matters when you dress. We will use it with care, show you what we remember, and leave every answer open to change.

### Success condition

The survey succeeds when it materially reduces avoidable recommendation misses—wrong polish, uncomfortable footwear, disliked colors, inappropriate patterns, impractical bags, excessive branding, or a mismatch between practicality and expression—without making the customer feel categorized, scrutinized, or fixed in place.

### Non-goals

The survey does not:

- diagnose a style type;
- determine attractiveness or what is “flattering”;
- infer body shape, age, income, class, gender expression, profession, religion, culture, or social status;
- prescribe essential wardrobe items;
- treat designer knowledge or spending as evidence of taste;
- generate a shopping list;
- compare customers or create population-based assumptions;
- infer preferences from location or brands owned;
- require measurements or photographs;
- replace current-day context, garment eligibility, or the governed stylist engine.

## 4. Survey architecture

### 4.1 Minimum viable question count

**Fourteen core questions are required to mark the profile “Ready.”** Every core question includes `It depends` or `I am not sure yet` where appropriate so the customer is never forced into a false preference. These are valid explicit answers, not missing data.

The 14 core questions cover:

1. practicality versus expression;
2. default polish;
3. occasion-specific polish;
4. casual/elevated decision behavior;
5. style communication words;
6. silhouette direction;
7. fit preferences;
8. favorite colors;
9. avoided colors;
10. pattern tolerance;
11. comfort requirements;
12. footwear and heel tolerance;
13. weather sensitivity;
14. wardrobe priorities.

Fewer than 14 creates material blind spots in Dress My Day. For example, polish without occasion context is too broad; silhouette without fit is unreliable; style without comfort and weather can become impractical; and aesthetic preference without wardrobe priority does not support stewardship.

The survey also contains **10 optional refinements**. Optional questions display `Skip for now`, remain editable later, and never reduce the status or dignity of a core-complete profile.

### 4.2 Chapters

The survey is divided into four short chapters:

1. **How you want to feel** — intent, polish, occasion, practicality, expression.
2. **What feels like you** — silhouettes, fit, color, pattern, style language.
3. **What works in real life** — comfort, footwear, weather, fabrics, bags, garment roles.
4. **What deserves a place** — wardrobe priorities, brands, budget, logos, trends, accessories.

Chapters are functional labels with warmth, not theatrical navigation. The customer sees approximate time remaining and can save and leave at any point.

### 4.3 Question-design rules

- Ask one idea at a time, except bounded matrices where context comparison is the purpose.
- Never show more than six ungrouped choices without search, grouping, or progressive disclosure.
- Do not use a forced binary where `It depends`, `Neither`, `Both`, or `Not relevant to me` is truthful.
- Randomization may reduce order bias within neutral answer sets, but must not randomize ranked scales or change persisted option IDs.
- Visual comparisons use garment silhouettes, flat lays, or styled pieces—not body “before and after” images.
- Visual cards must be equivalent in image quality, lighting, price signaling, model representation, styling effort, and brand visibility.
- Every visual choice has a complete text label and can be answered without imagery.
- A selection communicates likelihood or preference, not a permanent prohibition unless the customer explicitly chooses `Avoid` or `Never recommend`.
- Optional free text is length-bounded and treated as untrusted data, not model instructions.

## 5. Complete survey question set

The identifiers below are stable product IDs, not customer-facing labels. Answer values must also use stable, versioned IDs rather than display copy.

### Chapter 1 — How you want to feel

#### Q1. The balance Curated should strike

**Core:** Yes  
**Format:** Single choice on a five-position labeled scale  
**Prompt:** “When practicality and expression pull in different directions, where should Curated usually begin?”

**Choices:**

1. `practical_first` — Practical first; keep style quietly present
2. `practical_lean` — Mostly practical, with one considered detail
3. `balanced` — Balance practicality and expression
4. `expressive_lean` — More expressive when the day allows
5. `expressive_first_within_constraints` — Lead with expression, while respecting real constraints

**Use:** Sets the default practical/aspirational candidate preference after all hard constraints pass. It never permits an unsafe, unavailable, uncomfortable, or dress-code-inappropriate look.

#### Q2. Everyday level of polish

**Core:** Yes  
**Format:** Single choice with text and simple visual references  
**Prompt:** “On an ordinary day, how finished do you like to feel?”

**Choices:**

- `relaxed` — Relaxed and unstudied
- `easy_considered` — Easy, with one considered element
- `polished` — Clearly polished
- `highly_composed` — Fully composed, even for an ordinary day
- `context_dependent` — It depends entirely on the day

**Use:** Establishes a general baseline only. Q3 and current-day intent override it by context.

#### Q3. Polish by occasion

**Core:** Yes  
**Format:** Compact occasion matrix; one answer per relevant row  
**Prompt:** “How polished do you usually want to feel for each part of life?”

**Rows:**

- Errands / everyday tasks
- Work or professional plans
- Social plans
- Dinner
- Travel days
- Formal or ceremonial occasions

**Choices per row:**

- `relaxed`
- `considered`
- `polished`
- `highly_dressed`
- `varies`
- `not_part_of_my_life`

**Use:** Creates context-specific polish preferences. `Not part of my life` suppresses assumptions; it does not prevent a future one-off recommendation when the customer explicitly enters that occasion.

#### Q4. Casual or elevated when both work

**Core:** Yes  
**Format:** More likely / less likely comparison  
**Prompt:** “When both would be appropriate, which direction are you more likely to choose?”

**Comparison:**

- A: relaxed foundation with a polished detail
- B: elevated foundation softened with something easy

**Choices:**

- `more_likely_a`
- `more_likely_b`
- `equally_likely`
- `depends_on_occasion`

**Use:** Helps candidate construction distinguish “casual made intentional” from “elevated made approachable.” It is not a dress-code override.

#### Q5. What style should communicate

**Core:** Yes  
**Format:** Select up to five, then rank the top three; optional fill-in  
**Prompt:** “What would you like your style to communicate?”

**Choices:**

- Assured
- At ease
- Considered
- Creative
- Discreet
- Distinctive
- Elegant
- Energetic
- Grounded
- Modern
- Playful
- Polished
- Romantic
- Strong
- Warm
- Unconventional
- `Something else` — optional text, 60 characters

**Use:** Ranked terms shape editorial quality and explanation language. They do not become identity labels or public profile tags.

### Chapter 2 — What feels like you

#### Q6. Silhouette directions

**Core:** Yes  
**Format:** Four visual preference comparisons, each answered `More likely left`, `More likely right`, `Both`, `Neither`, or `Depends`  
**Prompt:** “Which shapes are you more likely to feel like yourself in?”

**Pairs:**

1. Structured / fluid
2. Defined waist / straight line
3. Close or skimmed fit / relaxed volume
4. Clean single layer / layered composition

**Visual specification:** Neutral, brand-free garment illustrations or flat lays with equivalent color, formality, styling effort, and image quality. No pair may imply that one silhouette is slimmer, younger, wealthier, more feminine, or more fashionable.

**Use:** Produces four independent silhouette preferences with context allowed. It never maps to body type.

#### Q7. Fit preferences by garment type

**Core:** Yes  
**Format:** Matrix with optional rows  
**Prompt:** “How do you usually prefer these pieces to fit?”

**Rows:**

- Tops and shirts
- Knitwear
- Jackets and outerwear
- Trousers and jeans
- Skirts
- Dresses or one-piece dressing

**Choices per row:**

- `close`
- `skimming`
- `relaxed`
- `oversized`
- `varies`
- `do_not_wear`

**Use:** Contextual fit preference. It does not change garment size, imply a body judgment, or override confirmed item-specific fit problems.

#### Q8. Colors to return to

**Core:** Yes  
**Format:** Multi-select color families, then choose up to three “return to often”; optional text  
**Prompt:** “Which colors do you enjoy wearing?”

**Color families:**

- Black
- White / ivory / cream
- Grey / silver
- Camel / tan / brown
- Navy
- Blue
- Green
- Yellow / gold
- Orange / rust
- Red / burgundy
- Pink / rose
- Purple / aubergine
- Metallics
- Multicolor
- `It changes by season`
- `Something specific` — optional text

**Use:** Multi-selected colors are positive options; ranked colors get stronger soft preference. They never exclude other colors.

#### Q9. Colors to use carefully

**Core:** Yes  
**Format:** Optional multi-select using the same color taxonomy plus scope  
**Prompt:** “Are there colors you would rather Curated use sparingly?”

**Choices:** Same color families, plus:

- `none`
- `only_as_an_accent`
- `avoid_near_face`
- `avoid_for_clothing_but_accessories_are_fine`

After selecting a family, the customer chooses `Use sparingly` or `Avoid` and may apply one scope.

**Use:** `Avoid` is an explicit negative preference but not a hard safety constraint. A current explicit request may override it. Curated should explain a deliberate exception.

#### Q10. Pattern tolerance

**Core:** Yes  
**Format:** Single choice plus optional pattern chips  
**Prompt:** “How much pattern usually feels right?”

**Choices:**

- `solids_preferred` — Mostly solids
- `subtle_pattern` — Subtle texture or quiet pattern
- `one_pattern` — One clear pattern at a time
- `pattern_comfortable` — Comfortable with noticeable pattern
- `pattern_mix` — Open to considered pattern mixing
- `depends`

**Optional pattern chips:** stripe, check/plaid, floral, geometric, animal, abstract, dots, paisley, other. Each can be marked `Enjoy`, `Neutral`, or `Avoid`.

**Use:** Affects pattern competition, candidate diversity, and Personal Shopper compatibility. Pattern tolerance does not equate to trend tolerance.

### Chapter 3 — What works in real life

#### Q11. Comfort non-negotiables

**Core:** Yes  
**Format:** Multi-select with severity  
**Prompt:** “What should Curated protect without needing to ask each time?”

**Choices:**

- Easy movement
- Comfortable sitting
- Walkable footwear
- Low carrying burden
- Breathable fabrics
- Warmth
- Light layers
- Soft or non-irritating materials
- No restrictive waistbands
- Preferred coverage
- Easy dressing / closures
- Mobility or accessibility needs
- Sensory considerations
- `No standing requirements`
- `None of these are consistent`
- `Something else` — optional private text, 200 characters

For each selected item: `Required` or `Preferred`.

**Use:** `Required` becomes an explicit comfort constraint within relevant contexts. `Preferred` receives strong ranking weight. Free text must be processed minimally and must not be used to infer a diagnosis.

#### Q12. Footwear and heel tolerance

**Core:** Yes  
**Format:** Two-part structured question  
**Prompt A:** “Which shoes are you genuinely comfortable wearing?”

**Multi-select choices:**

- Flat sandals
- Sneakers
- Loafers / flats
- Boots
- Low heels
- Mid heels
- High heels
- Platforms / wedges
- Dress shoes
- Other

**Prompt B:** “For a day with walking or standing, what is your maximum comfortable heel?”

**Single choices:**

- Flat only
- Up to 1 inch / 2.5 cm
- Up to 2 inches / 5 cm
- Up to 3 inches / 7.5 cm
- Over 3 inches / 7.5 cm
- Depends on duration or shoe
- I do not wear heels

**Use:** Walkability and explicit heel limit are constraints when walking/standing is known. Footwear likes remain preferences. The engine must not infer tolerance from shoes owned.

#### Q13. Weather sensitivity

**Core:** Yes  
**Format:** Five-row sensitivity matrix  
**Prompt:** “Which conditions affect what you can comfortably wear?”

**Rows:** cold, heat, humidity, rain/wet conditions, wind.

**Choices:**

- `not_especially_sensitive`
- `somewhat_sensitive`
- `very_sensitive`
- `depends`
- `not_sure`

**Optional follow-up:** “Anything Curated should know?” 150 characters.

**Use:** Changes environmental scoring and layering. It never substitutes for event-time weather or creates a medical inference.

#### Q14. Wardrobe priorities

**Core:** Yes  
**Format:** Choose up to five, then rank the top three  
**Prompt:** “What would you most like Curated to help your wardrobe do?”

**Choices:**

- Make everyday dressing easier
- Feel more confident for work
- Dress more intentionally for social plans
- Use more of what I own
- Rewear favorites in new ways
- Build better complete outfits
- Prepare for weather and transitions
- Pack with less excess
- Define a clearer point of view
- Explore more color or pattern
- Refine fit and comfort
- Buy fewer, better pieces
- Recognize genuine wardrobe gaps
- Care for and maintain what I own
- Adapt to a new chapter of life
- `Something else` — optional text

**Use:** Controls which equally eligible benefits Curated emphasizes. It cannot create shopping pressure or override current needs.

### Chapter 4 — Optional refinements

#### Q15. Fabric and material preferences

**Core:** No  
**Format:** Yes/no gateway, followed by material chips with `Enjoy`, `Neutral`, `Use carefully`, `Avoid`; optional text  
**Prompt:** “Are there materials you seek out or prefer not to wear?”

**Gateway choices:** `Yes`, `No consistent preference`, `Not sure yet`. Choosing `Yes` reveals the material chips; the other answers complete the question without adding material assumptions.

**Choices:** cotton, linen, wool, cashmere, silk, satin, denim, leather, suede, velvet, lace, technical/performance fabrics, synthetics, sequins/embellishment, faux fur, other.

**Use:** `Avoid` may become a strong explicit preference. Known allergy, sensory, care, or ethical requirements must be captured separately as a required constraint, not inferred from `Avoid`.

#### Q16. Jewelry and accessory presence

**Core:** No  
**Format:** Single choice plus multi-select  
**Prompt:** “How present do you like jewelry and accessories to feel?”

**Choices:**

- `minimal` — Barely there
- `one_signature` — One signature piece
- `layered_quiet` — Several quiet pieces
- `statement` — A visible statement
- `varies`
- `rarely_wear`

**Optional types:** earrings, necklaces, bracelets, rings, watches, belts, scarves, hats, brooches, eyewear, fragrance, other.

**Use:** Determines when accessories complete a look and prevents unnecessary ornament. Fragrance can be referenced only if it exists as a user-owned item and the feature is approved to do so.

#### Q17. Bag preferences

**Core:** No  
**Format:** Ranking plus functional requirements  
**Prompt:** “What matters most in a bag for daily recommendations?”

**Rank up to three:**

- Hands-free
- Lightweight
- Holds a laptop
- Holds daily essentials
- Compact
- Structured
- Soft / relaxed
- Secure closure
- Weather-resilient
- Makes a statement
- Quiet and versatile
- I rarely carry a bag

**Optional carry styles:** tote, shoulder, crossbody, top-handle, clutch/evening, backpack, belt bag, other.

**Use:** Functional requirements precede aesthetic bag preference. The engine recommends only owned, available bags.

#### Q18. Visible branding and logos

**Core:** No  
**Format:** Single choice  
**Prompt:** “How do you feel about visible logos or recognizable branding?”

**Choices:**

- `avoid` — Prefer no visible branding
- `discreet` — Discreet branding is fine
- `selective` — A recognizable detail can work selectively
- `comfortable` — Comfortable with visible branding
- `depends`
- `no_preference`

**Use:** Affects visual compatibility and candidate ranking only when branding metadata is known. It must never be inferred from price or brand owned.

#### Q19. Trend tolerance

**Core:** No  
**Format:** More likely / less likely comparison  
**Prompt:** “When considering something current, which statement is more like you?”

**Statements:**

- A: I prefer enduring pieces and adopt trends rarely
- B: I enjoy a current idea when it works with my wardrobe

**Choices:**

- `much_more_a`
- `somewhat_more_a`
- `equally_true`
- `somewhat_more_b`
- `much_more_b`
- `depends`

**Use:** Personal Shopper and expressive alternatives may use this as a soft signal. It must never make trend participation a requirement or mark existing clothing as outdated.

#### Q20. Garment roles by occasion

**Core:** No  
**Format:** Optional category-to-occasion matrix with `Reserved`, `Often`, `Sometimes`, `Never`, `Not applicable`  
**Prompt:** “Are there kinds of pieces you keep for particular parts of life?”

**Occasion columns:** errands, workouts, work, social plans, dinner, travel, formal/ceremonial.

**Category rows:** activewear, casual basics, denim, tailoring, dresses/one-piece looks, occasionwear, outerwear, shoes, bags, jewelry/accessories. The customer may add one custom category or specific owned item.

**Use:** `Reserved` is an occasion-specific constraint only for the selected category or item. Category-level reservations should be applied cautiously: an explicit current request or specific item assignment is stronger. `Never` means the category is not used for that occasion, not that the customer dislikes it generally.

#### Q21. Brands already trusted

**Core:** No  
**Format:** Yes/no gateway followed by searchable multi-entry text with reason tags  
**Prompt:** “Are there brands you return to—and what tends to work?”

**Gateway choices:** `Yes`, `No`, `Not sure yet`. `No` is not interpreted as unfamiliarity with brands or a preference against branded clothing.

For each brand, optional reasons:

- Fit
- Quality
- Materials
- Proportions
- Color
- Reliability
- Values
- Service
- Aesthetic
- Other

**Use:** Brand preference is supporting evidence, never a proxy for income, taste, body, or automatic product recommendation. Owned brand data must not populate this answer without confirmation.

#### Q22. Aspirational brands or references

**Core:** No  
**Format:** Searchable text entries with reference intent  
**Prompt:** “Are there designers, people, places, films, or references whose point of view you admire?”

For each entry:

- `would_wear`
- `admire_but_not_for_me`
- `interested_in_one_element`
- optional note: “What draws you to it?”

**Use:** Prevents admiration from being mistaken for purchase intent or literal imitation. These references may inform editorial direction only through supported attributes; the engine may not fabricate brand characteristics.

#### Q23. Shopping comfort ranges

**Core:** No  
**Format:** Currency-aware ranges by category; `Prefer not to say` always available  
**Prompt:** “If Curated helps with a future purchase, what ranges usually feel comfortable?”

**Rows:** everyday clothing, investment clothing/outerwear, shoes, bags, jewelry/accessories.

**Choices per row:**

- `prefer_not_to_say`
- user-entered minimum/maximum in selected currency;
- `varies_by_need`;
- `not_a_category_i_shop`.

Optional checkbox: `Show me owned alternatives before anything to buy` — preselected and always enforced as Curated's default regardless of response.

**Use:** Personal Shopper filters suggestions and can recommend `Wait` or `Pass`. Budget never affects Dress My Day ranking, status language, or the perceived quality of an owned item. Exact ranges are not sent to an AI model unless needed for a specific, consented shopping decision; a derived band is preferred.

#### Q24. A note in the customer's own words

**Core:** No  
**Format:** Optional fill-in-the-blank, 500 characters  
**Prompt:** “What does a very good dressing day feel like to you?”

Supporting prompt: “A sentence or two is enough. You may leave this blank.”

**Use:** Preserves nuance as explicit customer text. It is stored separately from structured answers, treated as untrusted data, and may be summarized into a proposed structured preference only after customer confirmation. It is not passed wholesale to every recommendation.

## 6. Required versus optional behavior

### Core questions

- A customer may leave at any time and retain progress.
- `Not sure`, `Depends`, or `Not relevant` counts as a completed answer when offered.
- The survey is “Ready” after all 14 core questions have a valid response.
- The product must not block other features while core questions remain incomplete.
- A customer can explicitly choose `Skip this question` on a core question after a gentle explanation that it may limit personalization. The profile then remains `In progress`, but recommendations continue with lower confidence for that dimension.

### Optional questions

- Every optional question shows `Skip for now` with equal visual dignity.
- Skipping creates no negative signal, default preference, or reminder campaign.
- Optional modules can be completed individually later from Profile.

### No coercive completion mechanics

Do not use streaks, completion pressure, red warning badges, expiring benefits, “unlock” language, or repeated prompts. A quiet profile status may say `Ready`, `In progress`, or `Not started` and state which recommendation areas could benefit from more context.

## 7. Data model

This is a product contract, not a database migration. Engineering should map it into the existing user-owned Profile domain without duplicating wardrobe, recommendation, history, or inference logic.

### 7.1 Entity separation

| Entity | Purpose | May overwrite another class? |
| --- | --- | --- |
| `style_survey_response_set` | One versioned survey completion/edit session for one customer | No |
| `explicit_style_preference` | Active structured answers explicitly supplied or confirmed by the customer | No; supersedes prior explicit version only through customer action |
| `explicit_style_note` | Optional free text supplied by the customer | No |
| `observed_style_signal` | Timestamped behavior such as swap, wear, save, correction | No |
| `inferred_style_preference` | Explainable proposal derived from repeated evidence | Never overwrites explicit data |
| `recommendation_outcome` | Suggested, viewed, changed, selected, worn, feedback | No |
| `garment_fact` / availability | Canonical wardrobe-owned facts | No |

### 7.2 Survey response set

Required fields:

- response-set ID;
- user ID;
- survey schema version;
- status: `not_started`, `in_progress`, `core_complete`, `complete`, `archived`;
- started, last-saved, core-completed, and completed timestamps;
- locale and answer-display version;
- completion source: `profile_survey`, `profile_edit`, or `explicit_confirmation`;
- consent state for use in recommendations;
- answered core count and optional count, derived rather than authoritative;
- prior response-set/version reference where applicable.

### 7.3 Explicit preference record

Each normalized explicit answer contains:

- preference ID and user ID;
- stable subject, such as `polish.default` or `comfort.walkable_footwear`;
- structured value and optional scope;
- context dimensions, such as occasion, garment category, weather, or activity;
- polarity: `prefer`, `avoid`, `required`, `neutral`, `varies`, `not_applicable`;
- rank where relevant;
- provenance: `survey`, `profile_edit`, `feedback_confirmation`, or `direct_instruction`;
- source response-set and question version;
- confidence class: `explicit_confirmed`;
- effective-from timestamp;
- superseded-at timestamp when the customer edits it;
- optional review date only when requested by the customer;
- privacy/consent flags required for sensitive free text;
- human-readable “Why Curated knows this” copy.

Explicit answers do not use probabilistic confidence. Their authority comes from provenance, scope, recency, and whether the customer has superseded them—not from an AI-generated percentage.

### 7.4 Observed signal record

Each signal contains:

- user ID;
- event type;
- timestamp;
- narrow subject/value/context;
- source feature and source record ID;
- whether the action was independent, Curated-exposed, or prompted;
- positive, negative, or ambiguous direction;
- default signal strength;
- expiry/decay policy;
- consent/learning state.

Viewing or ignoring is very weak evidence. `I wore this` confirms wear, not satisfaction. Explicit correction is very strong within its stated scope.

### 7.5 Inferred preference record

Each inference contains:

- user ID;
- subject, value, and narrow context;
- positive and negative evidence counts;
- evidence references without unnecessary raw private content;
- confidence: `low`, `medium`, or `high`;
- first and most recent evidence timestamps;
- inference/rules version;
- status: `proposed`, `confirmed`, `dismissed`, `expired`;
- expiry/decay policy;
- user-facing explanation;
- conflict state with active explicit preferences.

### 7.6 Confidence and provenance rules

| Class | Meaning | Engine authority |
| --- | --- | --- |
| `explicit_current` | Current instruction for this recommendation | Highest preference authority after safety/eligibility |
| `explicit_confirmed` | Active survey answer or Profile edit | High within its recorded scope |
| `inferred_high` | Repeated, compatible, recent evidence; not contradicted by explicit answer | Soft, context-specific influence; may prompt confirmation |
| `inferred_medium` | Several compatible signals or one strong outcome | Small soft influence; should not be stated as fact |
| `inferred_low` | Early or ambiguous evidence | Observe only; do not materially change a recommendation |
| `unknown` | No evidence or skipped answer | No default assumption; lower relevant recommendation confidence |

Minimum inference thresholds must be versioned and evaluated, not hard-coded in UI. A suggested starting policy is:

- `low`: one or two compatible signals;
- `medium`: at least three compatible signals across at least two occasions, with no strong contradiction;
- `high`: at least five compatible signals across at least three occasions and meaningful time, with no active explicit conflict.

These are product calibration hypotheses, not permission to apply an inference automatically. Sensitive, comfort, accessibility, fit, budget, or body-related preferences always require explicit confirmation before becoming constraints.

### 7.7 User isolation

- Every record belongs to exactly one authenticated customer.
- No customer's answers, wardrobe, brands, budget, or outcomes may set a default for another customer.
- Aggregate model training or benchmarking from private profile data is prohibited without a separately approved, meaningful consent and privacy design.
- Global styling priors may fill compositional gaps only after user-specific evidence and governed context; they must never claim to describe the customer.

## 8. Recommendation-engine integration rules

### 8.1 Precedence

Survey answers join the existing decision hierarchy; they do not replace it. Preference precedence is:

1. current explicit instruction;
2. item-specific confirmed constraint;
3. context-specific explicit Profile/survey preference;
4. current general explicit Profile/survey preference;
5. high-confidence inferred context preference;
6. medium-confidence inferred tendency;
7. low-confidence evidence for observation only;
8. generic styling prior.

Ownership, availability, explicit dress code, safety, weather, activity requirements, confirmed fit failures, and accessibility remain above all style preferences.

### 8.2 Scope matching

- Apply an answer only when its context matches the decision. Dinner polish does not become an errands rule.
- A specific garment/item constraint outranks a category preference.
- `Varies`, `Depends`, and `Not sure` are meaningful structured values. They instruct the engine not to overgeneralize.
- `Not part of my life` reduces proactive assumptions but does not block a customer-entered one-off occasion.
- Positive preferences rank eligible candidates; explicit `Required` comfort needs and confirmed avoidances can constrain them within scope.
- Never use preferred brands to favor a branded owned item when another candidate better serves occasion, comfort, weather, or current intent.

### 8.3 Dress My Day

Dress My Day may use:

- practicality/expression default when today's intention is absent;
- occasion-specific polish;
- silhouette and fit preferences;
- color/pattern preferences;
- required and preferred comfort needs;
- heel/walkability tolerance;
- weather sensitivity;
- accessories and bag preferences;
- garment-role reservations;
- ranked wardrobe priorities as a late-stage tiebreaker.

It must not use:

- shopping budget;
- aspirational brand as a reason to choose an outfit;
- brand status or presumed income;
- a general preference to override today's explicit intention;
- a skipped/unknown answer as an implicit default.

Survey factors enter the existing governed score under `Explicit user preference and today's intent`, `Fit and confidence`, `Comfort and mobility`, `Color harmony`, and relevant compatibility factors. They do not add an ungoverned “style match” score or bypass factor caps.

### 8.4 Personal Shopper

Personal Shopper may use:

- wardrobe priorities and actual wardrobe gaps;
- style, silhouette, fit, color, pattern, fabric, branding, trend, accessory, and bag preferences;
- trusted/aspirational references with their stated intent;
- category-specific shopping ranges;
- occasion-specific needs and garment roles.

Rules:

- Owned alternatives appear before a purchase recommendation.
- `Admire but not for me` must never be interpreted as purchase interest.
- A trusted brand is supporting evidence, not automatic approval.
- A budget is a boundary, not a target to spend.
- Missing budget produces no inferred income or price band.
- `Wait` and `Pass` remain first-class outcomes.
- No retailer, affiliate, or sponsor may alter the ranking invisibly.

### 8.5 Packing

Packing may use:

- garment roles;
- comfort, footwear, heel, weather, fabric, bag, and practicality preferences;
- occasion-specific polish;
- repeat-wear tolerance only if later asked explicitly or evidenced through confirmed travel behavior;
- wardrobe priorities such as packing with less excess.

It may not assume a travel lifestyle, destination activity, cultural requirement, laundry access, or willingness to repeat from this survey alone.

### 8.6 Explanation

Curated may reference one relevant explicit preference when it genuinely explains the decision:

> “I kept the shoes flat because you asked Curated to protect walkability on days with standing.”

It should not recite the profile, expose sensitive notes, mention budget in Dress My Day, or use deterministic language such as “You always…”.

Each explanation claim must trace to a current explicit record, confirmed item fact/outcome, or labeled inference. Explanation wording remains subject to the `AI_STYLIST_ENGINE.md` validator.

### 8.7 Correction and learning

- A current correction applies immediately to the current decision.
- `Just today` is the default scope for a one-off correction.
- `Remember for similar days` creates or updates an explicit context preference only after confirmation.
- Worn-outfit feedback creates an observed signal unless the customer explicitly confirms a preference.
- Repeated contradictory behavior may create a proposed inference but cannot silently alter or supersede an explicit survey answer.
- When credible conflict persists, Curated asks one respectful question in Profile, not during every recommendation:

> “You told us you usually prefer relaxed tailoring, but you have recently chosen more defined shapes for work. Has that preference changed?”

- Choices: `Yes, update it`, `Only for work`, `No, keep my answer`, `Not now`.
- `No` dismisses the inference and protects the explicit answer from repeated prompting until materially new evidence exists.

## 9. Profile editing experience

### 9.1 Profile structure

Under Profile / The Study, show three clearly separated areas:

1. **Your Style Notes** — explicit survey answers and direct edits.
2. **What Curated has noticed** — proposed or confirmed inferences with evidence summaries.
3. **Privacy and learning** — learning consent, reset, export, and deletion controls.

Do not merge inferred preferences into the survey answers or present a single opaque profile summary.

### 9.2 Style Notes overview

Group answers by the same four chapters. Each group shows a concise plain-language summary and `Edit`. Examples:

- “Balanced between practical and expressive”
- “Polished for work; considered for dinner; relaxed for errands”
- “Walkable shoes are required when the day involves standing”

Every entry shows:

- `You told us`;
- last updated date;
- relevant context/scope;
- `Used by` feature labels;
- `Edit` and `Clear`.

### 9.3 Editing behavior

- Edits save explicitly and take effect for future recommendations immediately.
- Existing recommendations retain their historical decision snapshot; they are not rewritten.
- A superseded explicit record is retained only as needed for continuity, audit, or user-visible style evolution and follows the approved retention policy.
- Clearing an answer returns it to `unknown`; it does not restore a generic default or an old inference.
- The customer may retake one chapter without retaking the full survey.
- A full `Review all answers` flow is available but never required.
- If an edit conflicts with a confirmed inference, the explicit edit wins and the inference becomes conflicted/dismissed as appropriate.

### 9.4 Inference review

Each proposed inference shows:

- what Curated noticed in non-invasive language;
- the context;
- confidence described as `Early observation`, `Emerging pattern`, or `Well-supported pattern`, not a percentage;
- a bounded evidence summary, such as “chosen in four confirmed work outfits this season”;
- `Confirm`, `Adjust`, `Not true`, and `Not now`.

The customer can disable learning, clear inferred preferences without deleting explicit answers, and inspect why an inference affected a recommendation.

### 9.5 Empty and partial states

**Not started:**

> A few notes about how you like to dress will help Curated make better choices. You may answer only what feels useful, and change anything later.

Action: `Begin Your Style Notes`.

**In progress:** show saved chapter and approximate remaining time. Action: `Continue` plus `Review what I have shared`.

**Core complete:**

> Curated has enough to begin with care. Add more detail whenever it would be useful.

Do not describe the profile as a percentage of a person.

## 10. Onboarding and completion flow

### 10.1 Entry

The survey lives under Profile and may be offered once after the customer has added enough wardrobe context to understand its value. It is never required during account creation.

Entry copy:

> **Your Style Notes**  
> A short, private consultation about how you like to dress. It takes about five minutes to give Curated a useful foundation. Every answer remains yours to edit or remove.

Before starting, state:

- what the answers improve;
- that they remain private and user-owned;
- that they are separate from what Curated may infer later;
- that they can be skipped, edited, reset, exported, or deleted;
- that no measurements, photographs, age, income, or body classification are required.

### 10.2 Progress

- Show chapter progress, such as `2 of 4`, and an honest approximate time remaining.
- Autosave each completed question and support device/session return.
- `Back` preserves answers.
- `Save and leave` is always available.
- Do not use celebratory pressure, countdowns, urgency, or completion rewards.
- A question with unsaved free text warns before navigation only when autosave failed.

### 10.3 Adaptive behavior

The survey may hide irrelevant follow-ups based only on the customer's current answer. Examples:

- selecting `I do not wear heels` skips heel-height detail;
- selecting `I rarely carry a bag` skips carry-style ranking;
- selecting `No colors to avoid` skips scope;
- selecting `Not a category I shop` skips its budget range.

Adaptive branching must not infer why an answer was given or add unasked defaults. Hidden questions remain `not_applicable`, not negatively answered.

### 10.4 Review before completion

After the 14 core questions, show a one-page review in human language. The customer can edit any section before selecting `Save my Style Notes`.

The review includes:

- three top style words;
- general and occasion-specific polish;
- key silhouette/fit directions;
- favorite and avoided colors;
- comfort and footwear boundaries;
- practicality/expression balance;
- top wardrobe priorities.

Do not generate a named style persona. Do not display a match score or “accuracy” claim.

### 10.5 Completion moment

Completion copy:

> **A considered beginning.**  
> Curated will use these notes when they are relevant—and will ask rather than assume when they are not. You can revisit them at any time.

Actions:

- `Return to Profile`
- `Dress My Day` when that feature is available and the wardrobe is sufficient
- `Add optional details`

This is the delight moment: a concise, specific summary that feels remembered, not scored. No confetti, badge, archetype reveal, or shopping prompt.

## 11. Privacy, trust, accessibility, and safety

### Privacy

- All survey and preference records are private by default and user-scoped.
- Process and retrieve them server-side through authenticated repositories.
- Do not sell, share, advertise against, or expose style/budget data to retailers or other customers.
- Retrieve only profile dimensions relevant to the current recommendation.
- Free text is potentially sensitive and untrusted; do not place it wholesale into prompts or logs.
- Budget requires separate shopping relevance and is not available to Dress My Day.
- Export, clear, reset, and deletion behavior must be defined and tested.

### Trust

- Always show whether Curated knows something because `You told us`, `You confirmed`, or `Curated noticed`.
- Never convert an inference to explicit data without confirmation.
- Never use absence of an answer as preference evidence.
- Never manufacture certainty from visual choices.
- Never create a profile from wardrobe brand, price, size, location, age, or body metadata.

### Accessibility

- All visual comparisons have equivalent text alternatives and keyboard operation.
- Color questions include written color names; do not require color perception alone.
- Ranking controls must have an accessible non-drag alternative.
- Matrices must linearize clearly on mobile and for assistive technology.
- Focus, error association, progress announcements, contrast, target size, and reduced motion meet the product's accessibility standard.
- Images include meaningful alternative text and no option is identifiable only by position.

### Dignity and safety

- Do not use “flattering,” “problem area,” “age appropriate,” “dress for your shape,” or similar body-coded language.
- Do not ask why a customer needs coverage, mobility, sensory, or comfort accommodation.
- Do not infer medical conditions from weather or fabric sensitivity.
- Do not make luxury-brand familiarity or large budgets appear more desirable.
- Do not present classic, maximal, minimal, modest, revealing, feminine, masculine, or androgynous expression as more correct than another.

## 12. Acceptance criteria

### Survey completion

- The core survey contains exactly 14 questions and can be completed in a median of 5–6 minutes in moderated usability testing.
- At least 80% of test participants complete the core path within 8 minutes without facilitator explanation.
- The optional full path has a median of 8–10 minutes.
- Progress saves after every answer and resumes correctly across sessions/devices.
- Optional questions can be skipped without friction or negative status.
- A customer may decline or abandon the survey and still use every eligible product feature.
- `Depends`, `Not sure`, `Neither`, and `Not relevant` persist as meaningful values.

### Data integrity

- Explicit answers, observed signals, inferred preferences, recommendation outcomes, and garment facts persist in separate user-owned domains.
- Every active preference has stable subject/value IDs, scope, provenance, schema version, effective date, and user ownership.
- Edits supersede the prior explicit version but do not rewrite historical recommendation snapshots.
- Clearing an answer produces `unknown`, not a default or resurrected inference.
- Cross-customer reads, writes, inference evidence, and recommendation use are rejected and tested.
- Skipped and hidden questions create no positive or negative preference.

### Recommendation behavior

- Current explicit instruction outranks survey answers.
- Context-specific survey answers outrank general survey answers.
- Explicit survey answers outrank unconfirmed inferred preferences.
- Required comfort/heel/accessibility constraints are never overridden by aesthetic preference or AI output.
- Survey preferences affect only documented governed scoring factors and cannot rescue hard-ineligible items.
- Budget data is unavailable to Dress My Day and cannot influence the perceived value of owned clothing.
- Personal Shopper shows owned alternatives before purchase recommendations and can return `Wait` or `Pass`.
- Packing does not infer travel patterns, laundry, or cultural requirements from survey answers.
- Explanations trace every profile-based claim to active provenance.

### Learning and correction

- Worn-outfit feedback does not silently change an explicit answer.
- Repeated contradictory evidence creates, at most, a proposed inference.
- A customer can confirm, contextualize, dismiss, or postpone an inference.
- Dismissed inferences do not repeatedly reappear without materially new evidence.
- Disabling learning stops new observed-signal aggregation while preserving explicit survey answers unless separately cleared.
- Resetting inferences does not delete survey answers; clearing survey answers does not falsify past recommendation records.

### UX, brand, and accessibility

- The experience uses no style archetype, score, percentage-of-self, comparison, shopping prompt, or completion gamification.
- Visual preference assets are brand-neutral, equivalently styled, diverse where people appear, and pass bias review.
- Every visual question is fully answerable without images.
- The survey is usable by keyboard and assistive technology and on a small mobile screen.
- Copy remains warm, concise, body-respectful, and candid about uncertainty.
- The completion summary reflects only supplied answers and contains no invented identity language.

### Privacy and security

- Browser responses never contain another customer's answers, inference evidence, or private free text.
- Free text is length-limited, sanitized for display, treated as untrusted input, and excluded from logs.
- Recommendation services retrieve only relevant profile dimensions.
- Export, reset, and deletion include all survey versions and derived inferences according to approved policy.
- No private survey data is used for advertising, retailer ranking, or model training without a separately approved consent design.

## 13. Risks and mitigations

| Risk | Product consequence | Required mitigation |
| --- | --- | --- |
| Survey fatigue | Customers abandon Profile or provide careless answers | 14-question core, optional refinements, autosave, honest time, no forced onboarding |
| False precision | Structured answers flatten nuanced style | `Depends`, scope, free text, per-context answers, later correction |
| Style typing | Curated becomes a quiz or generic persona engine | No archetypes, scores, labels, or identity conclusions |
| Visual bias | Image quality, bodies, brands, or styling effort steer choices | Brand-neutral equivalent assets, text parity, diverse review, randomized neutral order |
| Explicit answers become permanent | Product traps the customer in old taste | Effective dates, editing, supersession, style-evolution prompts, no silent overwrite |
| Inference overrides agency | Customer feels watched or misrepresented | Separate stores, explicit precedence, proposed inference review, learning controls |
| Brand preference becomes status proxy | Recommendations favor expense or prestige | Reasons captured, no income inference, brand as subordinate evidence |
| Budget becomes spending target | Personal Shopper encourages consumption | Boundary not target, owned alternatives first, `Wait`/`Pass`, no Dress My Day access |
| Comfort becomes body inference | Dignity and trust are harmed | Ask functional needs only; no diagnosis, body type, or “flattering” language |
| Sparse profile lowers service | Customers who skip receive poor treatment | Graceful degradation, one contextual question only when decision-changing |
| Profile logic is duplicated | Features drift and conflict | Central Profile read model, shared precedence/scope resolver, governed feature contracts |
| Free-text prompt injection | Untrusted text alters AI behavior | Treat as quoted data, derive structured proposals, validate output, minimize prompt use |
| Cross-user contamination | Catastrophic privacy and personalization failure | User ownership, RLS/repository filters, two-customer tests, no shared private defaults |
| Overfitting to recommendations | Curated manufactures the behavior it then learns | Track exposure, distinguish independent choice, cap learned influence, audit diversity |

## 14. Edge cases

Product and engineering QA must cover:

- customer completes only 1–13 core questions;
- customer skips every optional question;
- every core answer is `Depends` or `Not sure`;
- customer changes a core answer immediately after completion;
- customer retakes one chapter years later;
- old explicit answer conflicts with new current intent;
- explicit general answer conflicts with explicit occasion-specific answer;
- two explicit answers appear contradictory but have different scopes;
- customer clears an explicit answer while a matching inference exists;
- repeated behavior contradicts a current explicit answer;
- customer dismisses the same proposed inference more than once;
- learning is disabled before or after survey completion;
- customer requests deletion while a recommendation is in progress;
- survey schema changes after partial completion;
- an option is renamed, split, deprecated, or localized;
- answer order changes while stable IDs remain;
- customer does not wear heels, bags, dresses, jewelry, formalwear, or workwear;
- customer prefers uniforms and intentional repetition;
- customer enjoys both minimal and maximal expression in different contexts;
- customer admires a brand but would not wear or buy it;
- customer trusts a brand only for one category;
- budget varies dramatically by category or is omitted;
- selected currency changes or customer travels;
- customer has required mobility, sensory, coverage, or closure needs;
- free text contains medical, financial, traumatic, or other sensitive detail;
- free text contains prompt-injection text;
- color choices conflict with color-blind accessibility or display calibration;
- visual assets fail to load;
- ranking interaction cannot be dragged;
- matrix is viewed on a narrow mobile screen;
- a wardrobe contains none of the preferred silhouettes/colors;
- no eligible outfit satisfies a soft preference;
- small wardrobe makes repetition necessary;
- inferred preference was created from Curated-recommended outfits rather than independent choices;
- cross-customer ID is supplied to a Profile or recommendation endpoint.

## 15. Engineering handoff

Engineering may begin from this product specification after technical contract review. No production code is included here.

### 15.1 Required boundaries

- User Profile owns explicit answers, free text, observed signals, inferred preferences, provenance, consent, and review states.
- Wardrobe owns garment facts, brand metadata, availability, and item-specific fit/care information.
- Recommendation Engine consumes a minimal, feature-specific Profile projection through a shared resolver.
- Dress My Day, Personal Shopper, and Packing must not query survey tables directly or implement their own precedence logic.
- Historical recommendation snapshots retain the preference IDs/versions used without copying the full profile.
- Survey presentation components do not compute recommendation weights, confidence, or inferences.

### 15.2 Contracts to version independently

- survey schema and display-copy version;
- stable question/answer taxonomy;
- explicit preference subject/value taxonomy;
- context and scope taxonomy;
- provenance taxonomy;
- observed signal taxonomy and strength;
- inference thresholds, decay, and conflict policy;
- Profile-to-feature projection schemas;
- precedence and scope resolver;
- consent, retention, export, reset, and deletion behavior;
- visual asset set and bias/accessibility review version.

### 15.3 Shared Profile resolver

Engineering should define one server-side resolver that, for an authenticated customer and documented feature context:

1. loads only relevant active explicit preferences;
2. applies scope and context matching;
3. identifies current explicit overrides;
4. excludes dismissed, expired, conflicted, or unconsented inferences;
5. returns bounded confirmed/high-confidence inferred signals with provenance;
6. preserves `unknown`, `varies`, and `not_applicable` distinctly;
7. produces a minimal explanation-safe projection;
8. records which preference versions affected the decision.

This resolver must not calculate garment eligibility or recommendation scores; it supplies governed preference evidence to the existing engine.

### 15.4 Data and migration requirements

- Reuse the existing user-owned Profile domain; do not create feature-specific copies of colors, fit, comfort, brands, or budget.
- Map any current `style_notes`, `fit_notes`, or related fields into the new model only through an explicit migration/review experience. Do not parse free text into confirmed preferences silently.
- Preserve old data until the customer confirms migration, then retain or delete it according to the approved retention policy.
- Add row-level ownership and repository-level user filtering to every table and mutation.
- Use idempotent writes for autosave and completion.
- Preserve response-set and explicit-preference history without making outdated values active.
- Sensitive free text and shopping budget require minimal retrieval and logging redaction.

### 15.5 Analytics and observability

Permitted aggregate product metrics, without answer content:

- survey start, core completion, optional completion, resume, and abandonment;
- completion time bands;
- per-question skip/error rate by stable question ID;
- edit and clear events;
- inference confirm/adjust/dismiss rates;
- recommendation correction rates attributable to preference dimensions using non-sensitive reason codes;
- authorization, save, and schema-migration failures.

Do not log answer values, brand names, budget, free text, comfort/accessibility notes, or identifiable preference combinations in analytics or traces.

### 15.6 Test requirements

- Unit tests for schema validation, branching, completion status, stable IDs, ranking, context matching, precedence, supersession, clearing, inference conflict, and projection minimization.
- Two-customer authorization tests for every survey, Profile, signal, inference, export, reset, and deletion path.
- Contract tests proving each feature receives only its approved fields.
- Tests proving budget never reaches Dress My Day.
- Tests proving inferred preference cannot overwrite explicit preference.
- Tests proving current instruction and confirmed constraints win.
- Prompt-injection tests for free text and reference names.
- Accessibility tests for visual comparisons, color options, rankings, matrices, keyboard flow, screen reader output, errors, and mobile layout.
- Bias review and usability testing for every visual asset set.
- Scenario tests using sparse, contradictory, evolving, non-luxury, small, uniform, and highly expressive wardrobes.

### 15.7 Delivery sequence

1. Approve question/answer taxonomy, Profile entities, provenance, precedence, scope, privacy, and visual-asset brief.
2. Implement response-set autosave, 14 core questions, review, completion, and Profile editing without inference.
3. Add shared Profile resolver and integrate explicit answers into governed Dress My Day factors.
4. Add optional fabric, accessories, bags, branding, trend, garment-role, brand, reference, budget, and free-text modules.
5. Integrate approved fields into Personal Shopper and Packing only when those features reach their roadmap gates.
6. Add observed signals and inference review after explicit preference behavior is stable and measurable.
7. Run privacy, security, accessibility, bias, and moderated usability release gates.

## 16. Product evaluation

### Does this strengthen Dress My Day?

**Yes.** It provides explicit evidence for polish, silhouette, fit, color, pattern, comfort, footwear, weather sensitivity, and practicality without weakening the day-specific decision hierarchy.

### Does this make the AI meaningfully smarter?

**Yes.** It replaces guesswork with structured, scoped, provenance-aware evidence. The system becomes smarter through correct data boundaries and correction—not through a longer generic prompt.

### Does this improve customer trust?

**Yes.** Customers can see what they told Curated, distinguish it from what Curated noticed, edit or remove both, and know that behavior cannot silently rewrite explicit preferences.

### Does this align with the Brand Bible?

**Yes.** The consultation is private, hospitable, wardrobe-first, body-respectful, candid about uncertainty, and restrained. It creates recognition without surveillance and evolution without erasure.

### Will this architecture still be correct in five years?

**Yes.** Stable taxonomies, explicit provenance, independent data classes, scope-aware resolution, versioned history, feature-specific projections, and customer-controlled correction support a ten-year style record without coupling Profile to one model or feature.

### Competitive Advantage Test

**Pass.** A competitor can copy the questions. The durable advantage is the long-term, user-controlled relationship among explicit preferences, contextual outcomes, corrections, confirmed wears, evolving inferences, and governed decisions. That compound history becomes harder to copy only if Curated preserves trust and provenance.

## 17. Final decision summary

### Decision

**Approve.** The Personal Style Profile Survey is ready for Engineering after normal technical contract and visual-asset review. No unresolved product decision blocks implementation.

### Estimated completion time

- **Core 14 questions:** approximately 5–6 minutes
- **Full survey with optional refinements:** approximately 8–10 minutes

### Ten highest-value questions

1. Q1 — practicality versus expression
2. Q3 — polish by occasion
3. Q11 — comfort non-negotiables
4. Q12 — footwear and heel tolerance
5. Q6 — silhouette directions
6. Q7 — fit preferences by garment type
7. Q13 — weather sensitivity
8. Q5 — what style should communicate
9. Q8/Q9 — preferred and avoided colors
10. Q14 — wardrobe priorities

Q8 and Q9 are treated as one color decision domain in this ranked list but remain separate survey questions because positive preference and explicit avoidance have different meaning and engine behavior.

### Founder decisions required

**None.** This PRD resolves the minimum question count, optional scope, survey name, inference thresholds as calibration hypotheses, budget handling, visual-comparison principles, and feature-integration boundaries. Founder direction would be required only to change the strategic premise—for example, making the survey mandatory, producing public style types, or using profile data for commerce or model training—none of which is recommended.
