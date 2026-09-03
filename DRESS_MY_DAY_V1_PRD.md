# Dress My Day V1 — Product Requirements Document

> **V2 authority notice — July 29, 2026:** The approved customer workflow and presentation requirements remain in force. Recommendation philosophy, forced option counts, correction authority, and selection behavior are governed by `RECOMMENDATION_QUALITY_ROADMAP.md` and `RECOMMENDATION_ARCHITECTURE_V2.md` where conflicts exist.

**Status:** Approved for Engineering  
**Owner:** Chief Product Officer  
**Date:** July 20, 2026  
**Product surface:** Today's Edit / Dress My Day  
**Implementation:** Not included in this document

## 1. Executive decision

**Decision: Approve for Engineering.**

Dress My Day V1 is approved as Curated's first daily styling ritual. All previously open founder decisions are resolved in this document. The existing implementation direction must be revised from “three outfit options for each event” into **one considered answer for the day, with a materially different alternative available on request**.

V1 must use the governed hybrid engine defined in `AI_STYLIST_ENGINE.md`:

1. Deterministic rules establish ownership, validity, hard constraints, availability, eligibility, outfit completeness, score boundaries, and validation.
2. AI may interpret bounded ambiguity and construct structured candidates using eligible owned item IDs only.
3. Deterministic rules score, compare, challenge, and reject candidates.
4. AI may write a concise explanation from approved facts.
5. A final validator confirms every garment and every explanation claim.

AI proposes; Curated decides. A generic prompt over the full wardrobe is not an acceptable implementation.

## 2. Source-of-truth review and reconciled decisions

This PRD was prepared after reviewing:

- `BRAND_BIBLE.md`
- `PROJECT_PLAN.md`
- `ROADMAP.md`
- `DESIGN_SYSTEM.md`
- `DATABASE_PLAN.md`
- `USER_PROFILE_SYSTEM.md`
- `PERSONAL_SHOPPER.md`
- `CALENDAR_INTEGRATION.md`
- `AI_STYLIST_ENGINE.md`
- the repository's supporting `ARCHITECTURE.md` and current Dress My Day domain boundaries

Where documents reflect different stages of product thinking, the following precedence applies:

- The Brand Bible's “private style house” and “maximalist with restraint” direction governs earlier “Dior boutique” or “quiet luxury” shorthand. The product must be warm, collected, and specific while remaining disciplined and accessible.
- Supabase is the selected PostgreSQL, authentication, and private storage platform where `DATABASE_PLAN.md` retains superseded Auth.js, Neon, or Vercel Blob language.
- The roadmap places manual Dress My Day before calendar and weather integrations. For the complete product defined here, **manual agenda remains the activation path, server-side weather ships in V1, and calendar connection remains optional and may follow without changing the product contract**. A successful weather response is never required to continue; its absence invokes the governed weather-unavailable state.
- `DailyAgenda` is the sole schedule boundary. Manual events are projected into it; calendar providers and provider-specific records must never be consumed directly by Dress My Day.
- The AI stylist blueprint's one-primary-answer standard governs presentation. Internal candidate diversity does not require three equal user-facing choices.
- The engine blueprint treats recent wear as a soft diversity signal, not a universal prohibition. Any existing fixed recent-wear exclusion must be revised so only actual unavailability, hygiene requirements explicitly represented as availability, or confirmed constraints create hard exclusions.

## 3. Product definition

Dress My Day is Curated's morning consultation: one calm, wardrobe-first answer to “What should I wear today?” grounded in the customer's actual day, owned clothing, practical conditions, comfort, preferences, and evolving history.

It is not:

- an outfit generator;
- a carousel of aesthetically plausible combinations;
- an event planner;
- a weather dashboard;
- a closet-rotation optimizer;
- a reason to shop;
- a generic styling chatbot.

The V1 promise is:

> Curated considers the day, checks what is truly available, and recommends one complete look the customer can wear with confidence—then explains its judgment plainly.

### Success outcome

The customer can move from opening Today's Edit to a credible, complete recommendation with one primary action and, in the normal case, no more than one consequential follow-up question.

## 4. Product principles applied

### Simplicity

Show the day and one primary action. Do not expose scoring, candidate generation, integrations, or wardrobe administration as a dashboard.

### Continuity

Dress My Day uses the same wardrobe records, `DailyAgenda`, explicit profile, availability states, confirmed wear history, and learned-signal model as the rest of Curated. It does not create parallel copies of events, preferences, outfits, or garment facts.

### Restraint

One primary recommendation is the default. An alternative exists to restore agency, not to make the customer perform the edit Curated should have made.

### Delight

The signature moment is **The Morning Note**: when the recommendation resolves, a short, specific sentence connects the look to the lived day—for example, “Keep the navy trousers through dinner; the velvet jacket is the only change worth carrying.” It must be evidence-based, never decorative filler or fabricated intimacy.

## 5. Target customer and job

### Primary job

> Help me decide what to wear for the real day ahead, using what I own, without making me organize more information than the decision deserves.

### Supporting jobs

- Help me feel appropriately dressed without erasing my taste.
- Protect me from practical mistakes involving weather, walking, dress code, laundry, fit, or transitions.
- Help me return to my wardrobe with imagination rather than pressure to buy.
- Remember what genuinely worked and become more useful with permission.

## 6. First-screen experience

### 6.1 Arrival hierarchy

Today's Edit opens as a consultation, not a dashboard. Above the fold, in order:

1. **Date-aware welcome** using the customer's local timezone. The customer's first name may appear if supplied.
2. **Today's shape**, a concise natural-language summary derived from `DailyAgenda`, such as “A client meeting at 10, then dinner at 7.” Source labels appear only where needed for trust.
3. **Context note**, showing weather only when available and fresh. Weather remains quiet and secondary.
4. **Today's intention**, an optional compact control with a sensible default: “How would you like to feel?” Options are limited to `At ease`, `Assured`, `Polished`, or `More expressive`, plus optional free text. This is a current-session instruction, not automatically a permanent preference.
5. **Primary action:** `Dress me for today`.

The screen may show a daily fashion quotation only if it does not displace the day's context or primary action. It must be editorially curated, correctly attributed, accessible, and non-random within a session. It is not required for recommendation generation.

### 6.2 Context editing

The day's summary has one quiet `Review today` action. It opens a focused surface where the customer can:

- add a manual plan;
- edit or remove a manual plan;
- correct an inferred occasion or dress code;
- exclude a read-only calendar item from this recommendation;
- choose the event that matters most when priorities are unclear.

Calendar-derived items are visibly read-only and never show edit, delete, reorder, RSVP, or write controls. A source disclosure may identify the calendar without exposing private provider identifiers.

### 6.3 First-use progressive disclosure

Do not require a complete profile, connected calendar, location, measurements, or extensive wardrobe onboarding. If the minimum recommendation requirements are not met, the first screen gives one dignified next step rather than a checklist.

## 7. Primary user action

The primary action is **`Dress me for today`**.

On activation, the system:

1. validates identity, permissions, date, timezone, and input freshness;
2. resolves the target day and, where relevant, the priority agenda item;
3. determines whether one decision-changing question is necessary;
4. builds the eligible wardrobe using deterministic rules;
5. constructs, scores, challenges, and validates complete candidates;
6. presents one primary recommendation;
7. persists a compact, versioned decision record only as allowed by the privacy policy.

If one question is necessary, the action transitions into that single question and then continues automatically. It must not become an interview.

## 8. Minimum required inputs

A recommendation may be generated only when all of the following are known:

1. **Authenticated customer:** the recommendation can use only user-owned records.
2. **Target date and IANA timezone:** required to interpret “today,” availability, weather freshness, and wear history correctly.
3. **A usable description of the day:** either at least one `DailyAgendaItem`, or a manual baseline such as `A usual day`, `Working from home`, `Running errands`, or a short free-text plan projected into `DailyAgenda`. A connected calendar is never required.
4. **Enough eligible owned garments to create one contextually complete outfit:** completeness is determined by the governed occasion template and may include a primary garment or top/bottom, shoes, an outer layer, or other support where the context requires it.
5. **No unresolved critical ambiguity that could materially reverse the recommendation:** if one exists, Curated asks one focused question.

The following are optional and must improve the answer without blocking it:

- a successful live-weather response; V1 attempts server-side weather whenever the customer has supplied or permissioned a relevant location, but failure does not block a responsible recommendation;
- connected calendar;
- location;
- dress code;
- complete garment metadata;
- availability confirmation for items whose state is `unknown`;
- explicit style preferences;
- comfort or fit notes;
- desired confidence/intention;
- confirmed wear history;
- inferred preferences;
- acquisition cost or cost per wear.

Missing optional data lowers recommendation confidence or produces a conditional instruction. Missing data must never be silently invented or scored as failure.

## 9. Decision context and influence on the result

### 9.1 Governing decision order

No lower-order factor may override a higher-order requirement:

1. Ownership, permission, privacy, schema validity, and freshness
2. Hard eligibility and availability
3. Day, occasion, and dress-code interpretation
4. Weather, environment, movement, and transitions
5. Explicit fit, comfort, accessibility, and confidence needs
6. Outfit completeness and compatibility
7. Today's stated intention and explicit preferences
8. Personal style and editorial quality
9. Wear history, rotation, wardrobe utility, and cost per wear
10. Validation and recommendation confidence

### 9.2 DailyAgenda

`DailyAgenda` is the source of truth for the day. It contributes:

- local date and timezone;
- timed and all-day plans;
- target event and relevant adjacent transitions;
- explicit or inferred occasion and dress code;
- location and indoor/outdoor evidence when supplied;
- time conflicts and source confidence.

V1 makes a day-level recommendation anchored to the most consequential known plan. “Consequential” is determined by explicit customer selection first, then dress-code specificity, formality, duration, and timing—not by commercial value or arbitrary event category.

V1 may create a base look spanning multiple compatible events and recommend one add/remove layer or one change item. It must not attempt complex itinerary optimization, luggage planning, or multiple independent outfits. When the day cannot be responsibly reduced to one dressing plan, Curated asks which event should lead or explains that a change is required.

### 9.3 Calendar

Calendar input is optional and read-only. When permission has been granted, only the minimum normalized event fields in `DailyAgenda` may influence styling: title, time, all-day status, location, source disclosure, and bounded occasion/dress-code inference.

Calendar input must never:

- bypass `DailyAgenda`;
- make a recommendation more authoritative merely because it is connected;
- expose or use descriptions, attendees, emails, organizer details, attachments, conferencing links, or unrelated events;
- cause a sensitive inference;
- prevent manual correction or exclusion;
- block Dress My Day when stale, disconnected, or unavailable.

### 9.4 Weather

Weather affects temperature suitability, breathability, rain/snow protection, wind, layering, walkability, and transition advice. It is evaluated at meaningful departure, event, and return times when those data exist.

Weather may create a hard exclusion only for a materially unsafe or clearly inappropriate item supported by governed thresholds and reliable garment attributes. It otherwise changes environmental scoring and practical instructions.

Weather must include location match and freshness. Weather is evidence, not a fashion rule; actual conditions override conventional seasonality.

### 9.5 Wardrobe availability

Availability is evaluated for the time the outfit is needed. Governed states are:

- `available`;
- `laundry` or `dirty`;
- `repair`;
- `packed`;
- `storage`;
- `loaned`;
- `reserved`;
- `unavailable`;
- `unknown`.

Known unavailable states are hard exclusions unless the state is contextually available—for example, a packed item within the confirmed travel closet. An `unavailableUntil` value is respected. An explicit clean/available override may restore eligibility when it is newer than the conflicting state.

`unknown` is not unavailable. A central unknown item may be presented as “if available,” lower operational confidence, or trigger the one focused question.

### 9.6 Laundry status

Laundry/dirty is a first-class availability fact, not a style penalty. A known dirty or in-laundry item cannot appear in a recommendation. Curated must never shame the customer or suggest shopping because a preferred item is unavailable.

Marking an outfit worn opens a brief availability review before saving. Curated proposes transparent, category-aware states:

- activewear, hosiery, underwear, sleepwear, and explicitly identified base layers default to `laundry`;
- outerwear, shoes, bags, jewelry, watches, and other non-laundered accessories default to `available`;
- dresses, tailoring, trousers, skirts, shirts, knitwear, and other context-dependent garments retain their current state and require a visible customer choice between `Available again` and `Laundry` when the appropriate state is not already known.

These are editable suggestions, not hidden automation. The customer reviews all proposed changes on the same confirmation sheet, and no availability mutation occurs until `Save wear` is confirmed. Curated may remember an explicitly chosen item/category handling preference later only with separate permission; V1 does not infer hygiene habits from repeated choices.

### 9.7 Wear history and rotation

Only confirmed wears affect wear count and last-worn dates. Generated, viewed, ignored, or merely accepted recommendations do not count as wears.

Wear history contributes:

- exact-outfit recency;
- dominant-combination recency;
- item frequency;
- context of prior wear;
- confirmed comfort, fit, confidence, or appropriateness outcomes.

Recent wear is a capped diversity and utility signal. It is not a hard exclusion unless the item's resulting availability state makes it ineligible. Rewearing may remain the best answer for a small wardrobe, a uniform dresser, travel, limited laundry options, or a particularly suitable look.

Rotation can break ties; it cannot rescue the wrong outfit. An underused item is never recommended from obligation.

### 9.8 Preferences

Preference precedence is:

1. today's explicit instruction;
2. item-specific confirmed constraint;
3. context-specific confirmed preference;
4. current explicit profile preference;
5. high-confidence learned preference;
6. low/medium learned tendency;
7. generic styling prior.

Explicit exclusions are hard constraints within their stated scope. Positive preferences influence ranking but do not override occasion, safety, availability, comfort, or dress code.

Inferred preferences must remain separate from explicit profile data, carry source, context, timestamp, and confidence, and remain reviewable, correctable, resettable, and deletable. One action cannot become a permanent style conclusion.

### 9.9 Comfort

Comfort is practical bodily experience: temperature sensitivity, fabric sensitivity, mobility or accessibility needs, coverage, fit, sitting/standing, commuting, walking, heel tolerance, and carrying burden.

Explicit comfort and accessibility requirements are constraints, not weak preferences. A technically polished outfit the customer cannot comfortably execute cannot win.

Unknown comfort data lowers confidence only when material to the context. Curated must not infer body concerns from photos, measurements, identity, or garment size.

### 9.10 Dress code

Dress-code evidence ranks as:

1. explicit customer instruction;
2. explicit permissioned invitation/reservation information;
3. high-confidence agenda text;
4. venue/time/occasion inference;
5. unknown.

Explicit requirements create hard eligibility boundaries. Inferred dress codes are always labeled as inferred and user-correctable; low-confidence formality may cap overall recommendation confidence. Curated must not infer religious, cultural, gender, relationship, or medical requirements from ambiguous context.

### 9.11 Customer confidence and recommendation confidence

These are separate concepts.

- **Customer confidence** is how the customer wants or reports feeling in an item, silhouette, or context. It affects personal fit and ranking and is never an AI judgment of appearance.
- **Recommendation confidence** is Curated's confidence in the evidence behind the answer. It is derived from critical dimensions: agenda, weather, wardrobe metadata, availability, fit/comfort, preferences, and known compatibility.

The lowest critical dimension may cap overall recommendation confidence. A high candidate score does not create high confidence when a decisive fact is uncertain.

### 9.12 Existing score architecture

After hard eligibility, complete candidates are ranked on the governed 100-point model:

| Factor | Default weight |
| --- | ---: |
| Occasion and formality fit | 18 |
| Weather and environmental fit | 15 |
| Comfort and mobility | 14 |
| Outfit completeness and compatibility | 13 |
| Explicit preference and today's intent | 12 |
| Fit and customer-confidence evidence | 10 |
| Color harmony | 7 |
| Wear rotation and recency | 5 |
| Wardrobe utility and cost per wear | 3 |
| Day/travel versatility | 3 |

Context may alter weights only within versioned, governed limits. Missing factors are removed and their weights redistributed proportionally among known relevant factors; evidence confidence and overall recommendation confidence are reduced.

Scores, weights, and internal grades are not shown to customers. They are decision tools, not claims of objective style truth.

## 10. Recommendation content and presentation

### 10.1 Primary recommendation

The recommendation view contains:

1. **A clear editorial title** for the look.
2. **The complete outfit**, using only owned item IDs, with garment photography where available and clear text labels where it is not.
3. **Why this works**, concise and evidence-based.
4. **Practical note**, only when relevant: layer, umbrella, footwear, timing, or one change item.
5. **Assumption or confidence note**, only when confidence is not high.
6. **Primary outcome action:** `I wore this`.
7. **Secondary actions:** `Another option` and `Change something`.

The interface must not display score numbers, AI/provider language, hidden reasoning, cost pressure, or claims unsupported by known garment data.

### 10.2 Why this works

The explanation should be two or three sentences and follow this order:

1. occasion and formality;
2. weather, movement, and transition practicality;
3. one personal, comfort, or wardrobe reason;
4. one assumption or optional adjustment if confidence is not high.

It should sound like a perceptive stylist, not a scoring report. It must be specific enough that another wardrobe could not receive the same explanation.

The explanation may say, “The loafers are the wiser choice for the walk.” It may not say, “You always wear loafers,” unless that is a supported, relevant, user-reviewable signal. Sensitive event details and body data must not be repeated unnecessarily.

### 10.3 Recommendation confidence behavior

- **High:** one clear answer; no confidence badge is necessary. An alternative remains available.
- **Medium:** one clear answer plus a brief, specific assumption and easy correction, such as “I have treated the dinner as polished but not formal.”
- **Low:** ask one focused decision-changing question before generation when possible. If no answer is available, show a clearly provisional baseline, name the missing fact, and make adjustment easy.

Never use vague confidence theater such as a percentage unless calibration evidence later proves it helpful and comprehensible.

## 11. Alternative outfit behavior

`Another option` reveals the next validated candidate without discarding the first.

Requirements:

- The alternative must be complete, eligible, and materially different in main garments, silhouette, or styling intent—not a cosmetic accessory swap.
- The first alternative should normally represent the strongest valid contrast: more expressive when the primary is practical, or more practical when the primary is expressive by explicit request.
- A rotation/wardrobe-utility candidate may be used only when it remains excellent for the day.
- The prior recommendation remains available through `Previous option`; the customer should never lose a choice while comparing.
- Requesting another option is a weak/medium signal that the first answer missed, not proof of a durable preference.
- After the first alternative, do not provide an endless refresh loop. Offer `Change something` so the customer can identify the actual issue.
- No alternative may include known unavailable items, violate a hard constraint, or become a shopping suggestion.
- If no materially different eligible alternative exists, say so with confidence: “This is the strongest complete look in the wardrobe for today. I can adjust one part if you tell me what feels off.”

## 12. “I wore this” behavior

`I wore this` is a consequential confirmation, not a lightweight like button.

On selection:

1. Confirm the outfit and the date/time of wear in a calm review sheet.
2. Allow the customer to remove any recommended item they did not actually wear before saving.
3. Save one durable outfit/wear record linked to the recommendation and a minimal agenda/occasion snapshot.
4. Update confirmed wear count and last-worn date only for the items actually worn.
5. Apply the governed availability/laundry transition per item/category; do not use a universal assumption hidden from the customer.
6. Mark the recommendation outcome as worn while retaining the distinction between “recommended” and “actually worn.”
7. Offer an optional, non-blocking reflection: `How did it feel?` with `At ease`, `Assured`, `Not quite me`, and `Something was off`.

The reflection is sampled rather than demanded after every wear. Marking an outfit worn does not imply satisfaction with every garment, fit, or styling decision.

### Memorable moment

After confirmation, the recommendation settles into Wardrobe History with a brief acknowledgment such as, “Remembered for today.” No confetti, streak, score, badge, or engagement reward is permitted.

## 13. Correction and feedback behavior

`Change something` opens a focused correction flow. The first choices are:

- `An item is unavailable`
- `Too formal / too relaxed`
- `Not comfortable enough`
- `Not the mood today`
- `I want to replace one piece`
- `Something else`

Behavior:

- Apply the correction immediately to the current recommendation request.
- If an item is marked laundry, repair, storage, loaned, or otherwise unavailable, update the canonical wardrobe availability record after explicit confirmation; do not store a recommendation-only duplicate.
- If a customer swaps an item, validate the revised complete outfit against the same hard constraints.
- Ask at most one follow-up question at a time.
- Make the scope of any learning explicit: `Just today` is the default; `Remember for similar days` requires affirmative choice.
- Explicit corrections are very strong signals within their stated scope.
- Fit or comfort problems should update an item/context constraint only after confirmation.
- Ignoring, viewing, or dismissing a recommendation must not create a durable negative preference.
- Learned inferences must never overwrite explicit profile facts or the customer's current instruction.

## 14. State specifications

### 14.1 Empty wardrobe

When no owned items exist, do not generate a recommendation and do not suggest shopping.

Show:

> Your wardrobe is still waiting for its first pieces. Begin with a few things you reach for often; that is enough for Curated to start being useful.

Primary action: `Add a piece`  
Secondary action: `How much do I need?`

The guidance explains that a small wardrobe is welcome and recommends adding the few items most often worn, not completing an inventory.

### 14.2 No calendar events / no agenda items

A blank calendar is not a blocked state. Show a small set of manual day shapes:

- `A usual day`
- `Working from home`
- `Out and about`
- `Add a plan`

The customer may also enter a short description. The choice becomes a manual `DailyAgendaItem`; Dress My Day does not create a parallel “no-event prompt” pathway.

### 14.3 Weather unavailable

Continue without weather when the day can be styled responsibly.

- Do not claim a temperature, rain, wind, or conditions.
- State: “I could not confirm the weather, so I have kept the layer adaptable.”
- Use season/home climate only as low-confidence context.
- Label weather-dependent advice as conditional.
- Offer `Add location` or `Try weather again` without blocking the recommendation.
- If weather is safety-critical to the event and no robust recommendation exists, ask for conditions or provide a clearly provisional indoor baseline.

### 14.4 Low-confidence state

Ask one question only when the answer could materially change the outfit. Prefer the question tied to the lowest critical confidence dimension.

Examples:

- “Is the wedding black tie?”
- “Will you be walking between the meeting and dinner?”
- “Are the loafers available today?”

If the customer skips the question, provide a provisional recommendation only if it is robust under the plausible answers. State the assumption and what would change. Otherwise explain why Curated needs that one fact.

### 14.5 Conflicting events

Conflicts include overlapping times, incompatible dress requirements, incompatible activity needs, or transitions that make one outfit impractical.

V1 behavior:

1. Detect the conflict deterministically from `DailyAgenda` timing and interpreted constraints.
2. If one base outfit plus an add/remove layer or one change item can span the day, recommend it and explain the transition.
3. If a full change is clearly necessary, say so and recommend one primary look plus the minimum change required.
4. If event priority or feasibility is ambiguous, ask: “Which part of the day should lead the decision?”
5. Never generate contradictory isolated recommendations for overlapping events.

V1 does not solve complex packing, shower, luggage access, or multi-location optimization. Those remain later governed capabilities.

### 14.6 No eligible outfit

This state means the wardrobe contains items but no complete look passes hard constraints.

The system must distinguish the reason:

- required pieces are known unavailable;
- wardrobe lacks a required category for completeness;
- explicit dress code cannot be satisfied;
- weather/safety makes every candidate invalid;
- item metadata is too uncertain to validate a complete look;
- an overly restrictive preference or mistaken status may be blocking the wardrobe.

Show the most actionable, wardrobe-first path:

- `Review availability`
- `Correct the dress code`
- `Relax today's preference`
- `Build from what is available`

Do not claim the customer “needs” to buy something. If no valid answer exists, Curated should say so honestly. Personal Shopper is not invoked automatically.

### 14.7 Loading

Loading should feel like attentive preparation, not synthetic speed theater.

- Preserve the visible day context and prevent duplicate submissions.
- Use a restrained progress sequence tied to real stages: `Considering the day` → `Checking what is available` → `Composing the look`.
- Do not display fabricated percentages or cycling AI copy.
- Target a prompt response; if processing becomes unusually long, show `This is taking longer than it should` with `Try again` and preserve the customer's inputs.
- Accessibility: announce meaningful state changes, respect reduced motion, and do not rely on animation alone.

### 14.8 Errors

Errors must be isolated and recoverable.

- **Recommendation service/model failure:** fall back to a valid deterministic candidate when available. If none exists, preserve context and offer `Try again`.
- **Calendar source failure:** show the affected source as unavailable; keep manual agenda and wardrobe functioning.
- **Weather failure:** follow the weather-unavailable behavior.
- **Persistence failure after generation:** do not falsely confirm a saved recommendation or wear; preserve the visible result and offer retry.
- **Stale or changed wardrobe state:** revalidate before presentation and again before `I wore this`; remove invalid candidates rather than repairing them in prose.
- **Authorization/ownership failure:** reveal no record existence or private details; require authentication again where appropriate.
- **Rate limit:** explain when the customer can try again without blame.

Tone example:

> I could not complete today's edit. Your day and wardrobe changes are safe; please try once more.

Never expose provider errors, model details, prompts, tokens, stack traces, or another customer's data.

## 15. Privacy, trust, dignity, and agency requirements

### Consent and minimization

- All recommendation work occurs server-side for the authenticated customer.
- Retrieve only the target agenda item, relevant adjacent transitions, eligible wardrobe fields, required profile signals, weather, and bounded history.
- Calendar and location data require explicit, revocable consent.
- Calendar access is read-only by construction and asks for no mail, contacts, attendees, or write scopes.
- The language model receives no provider tokens, raw provider IDs, unrelated events, exact purchase costs, raw measurements, or raw photos unless a later separately consented feature requires them.
- Event titles and locations are untrusted and potentially sensitive. They are never instructions to the model and are not repeated in the rationale unless necessary.

### Explainability

- Every recommendation retains a compact, versioned decision record: schema/engine/rules/model versions, minimal agenda snapshot or item ID, selected eligible owned IDs, hard constraints, reason-code bands, confidence dimensions, selected candidate, alternative references, and explicit outcome.
- Do not retain raw provider payloads, unnecessary agenda history, hidden chain-of-thought, excessive prompts, speculative sensitive inferences, or credentials.
- Customer-facing reasoning uses supported facts and plain language, not scores or proprietary mystery.

### Customer control

Customers can:

- correct occasion and dress-code inference;
- exclude an event or calendar source;
- disable learning;
- inspect and correct learned preferences;
- clear inferred preferences;
- delete recommendation history;
- disconnect context sources;
- export and delete their data.

Manual use remains available when integrations are declined or fail.

### Dignity

- Never judge bodies, weight, age, modesty, repetition, spending, or trend adherence.
- Never infer measurements from images or protected/sensitive characteristics from profile or agenda data.
- Accessibility and mobility needs are first-class constraints when supplied.
- Confidence refers to the customer's reported experience, not how closely the body meets an aesthetic ideal.
- Small wardrobes and repeated outfits are treated beautifully.
- Recommendations remain independent of retailer, affiliate, sponsor, or inventory incentives.

## 16. V1 exclusions

The following are expressly outside Dress My Day V1:

- calendar OAuth/provider implementation as an activation dependency; calendar may ship separately, but V1 includes the provider-neutral `DailyAgenda` boundary;
- calendar write actions, RSVP, event editing, attendee or email access;
- proactive notifications, reminders, engagement streaks, badges, or gamification;
- full multi-event itinerary optimization, automatic outfit changes for every event, or travel/luggage orchestration;
- packing-list generation or travel-closet management beyond respecting a confirmed availability boundary;
- autonomous long-term preference inference from single actions;
- cost-per-wear presentation unless acquisition cost and confirmed wear count exist and the insight is genuinely useful;
- visual try-on, body simulation, attractiveness ranking, or body-shape judgment;
- shopping recommendations, affiliate links, wardrobe-gap sales prompts, or automatic Personal Shopper escalation;
- trend feeds, social sharing, public profiles, community comparison, or engagement content;
- conversational free-form stylist chat as the primary interaction;
- more than one materially different alternative loop;
- exposing numeric scores or internal engine reasoning;
- automatic use of external data without specific consent;
- AI access to the full wardrobe when a bounded eligible subset is sufficient;
- permanent storage of raw weather or calendar payloads;
- complex style-evolution inference and confidence calibration beyond recording explicit V1 signals for later governed use.

## 17. Product acceptance criteria

### Core journey

- A customer with a small but sufficient wardrobe and no connected calendar can describe the day, choose an optional intention, and receive one complete recommendation.
- The first screen presents one clear primary action and does not resemble a dashboard.
- The normal journey asks zero follow-up questions; no journey asks more than one at a time.
- The recommendation contains only owned items and is complete for the governed occasion template.
- The recommendation displays a concise, factual “Why this works” explanation.
- One materially different validated alternative is available when the wardrobe supports it.
- `I wore this` records only the items actually confirmed as worn and updates canonical history exactly once.

### Rules and engine integrity

- Known laundry, dirty, repair, storage, loaned, contextually inaccessible packed, reserved, or unavailable items are never recommended.
- No score or AI output can rescue a hard-ineligible item.
- Recent wear affects ranking but does not by itself make an available item ineligible.
- Missing factors are redistributed rather than scored as zero, and confidence is lowered.
- Only eligible owned IDs can enter AI candidate construction or final output.
- Every candidate is deterministically validated after AI construction.
- Every explanation claim maps to an approved fact or clearly labeled inference.
- Model failure falls back to a validated deterministic candidate or a graceful no-result state.
- Same governed evidence and engine versions produce the same eligibility and score boundaries regardless of agenda source.

### State coverage

- Empty wardrobe, no agenda, missing weather, low confidence, conflicting events, no eligible outfit, loading, provider failure, model failure, persistence failure, stale state, and authorization failure have tested product behavior.
- Calendar or weather failure never blocks manual Dress My Day when a responsible recommendation remains possible.
- No eligible outfit state contains no shopping pressure.
- Low-confidence language identifies the missing fact without blaming the customer.

### Privacy and trust

- Cross-customer wardrobe IDs are rejected and reveal no private metadata.
- Browser bundles and responses contain no provider tokens, raw external calendar IDs, service credentials, or unrelated private context.
- Calendar strings are treated as untrusted data; prompt injection in titles, locations, and wardrobe notes cannot alter instructions or output constraints.
- Consent, disconnection, learning controls, correction, deletion, and error flows are accessible and dignified.
- Recommendation records contain only the approved compact snapshot and versioned reason codes.

### Accessibility and experience quality

- The complete flow works by keyboard and assistive technology, has visible focus, appropriate semantics, readable contrast, meaningful image alternative text, and reduced-motion behavior.
- Clothing photography leads visually without making text-only garments unusable.
- Loading and state changes are announced without noisy repetition.
- Mobile use supports the dressing moment without cramped option grids or hidden primary actions.
- Decorative brand elements can be removed and the journey remains clear and complete.

### Quality metrics

Launch readiness requires instrumentation for:

- valid recommendation completion;
- accepted-and-confirmed-worn rate;
- alternative and substitution rate;
- comfort/confidence/formality feedback;
- known-unavailable-item recommendation rate, which must be zero;
- rule violation rate, which must approach zero before release;
- explanation factuality;
- recommendation-confidence calibration by outcome;
- repetition appropriateness and wardrobe diversity by context;
- user-confirmed correction accuracy.

Acceptance rate alone is not a success metric.

## 18. Risks and mitigations

| Risk | Product consequence | Required mitigation |
| --- | --- | --- |
| Three-option choice overload | Curated delegates judgment back to the customer | One primary answer; reveal one alternative progressively |
| Generic prompt replaces governed engine | Hallucinated or inconsistent advice destroys trust | Rules-first eligibility, structured eligible IDs, scoring, challenge, final validation |
| Fixed recency exclusion | Penalizes rewearing and fails small wardrobes | Treat recency as capped soft signal; availability governs hygiene |
| Sparse wardrobe metadata | False claims about warmth, material, color, or fit | Preserve unknowns, prefer reliable evidence, lower confidence |
| Incorrect dress-code inference | Social discomfort and authority theater | Explicit evidence precedence, visible inference label, easy correction |
| Stale availability | Recommends an inaccessible item | Freshness checks, explicit unknown state, revalidate before display and wear |
| Calendar overcollection | Private-style-house promise collapses | `DailyAgenda` boundary, minimal fields, consent, short retention, exclusion/disconnect |
| Overlearning | Curated traps the customer in yesterday's taste | Separate signal stores, scoped learning, confirmation, decay in later phases |
| Favorite-item feedback loop | Narrow, repetitive recommendations | Cap preference influence; candidate diversity and rotation audits |
| Weather overconfidence | Impractical or unsafe look | Freshness/location confidence, governed thresholds, conditional advice |
| Shopping leakage | Stewardship becomes consumption | No purchase prompts or automatic Shopper escalation in Dress My Day |
| Excessive implementation breadth | Delays value and creates brittle orchestration | Manual agenda first; bounded server-side weather in V1; calendar optional; one-look day plan; explicit exclusions |
| Luxury styling obscures access | Beautiful but unusable experience | Accessibility as acceptance criterion independent of decoration |

## 19. Edge cases

Engineering and product QA must explicitly cover:

- a wardrobe with exactly one valid complete outfit;
- a small wardrobe where the best outfit was worn recently;
- all favorite footwear in laundry;
- an item marked available but blocked by `unavailableUntil`;
- an item whose explicit clean override is newer than its last wear;
- unknown availability for a central garment;
- incomplete garment category, season, color, material, or photo data;
- an all-day event plus timed events;
- overlapping events with different locations;
- office-to-dinner with no change opportunity;
- workout before a professional appointment with unknown shower/change access;
- a wedding with no stated dress code;
- a formal event whose inferred dress code conflicts with a user correction;
- rain with delicate shoes and uncertain outdoor exposure;
- a severe temperature change between departure and return;
- weather located somewhere different from the event;
- stale weather and changed calendar data during generation;
- daylight-saving transitions and customer timezone changes;
- a calendar title containing instructions or sensitive language;
- manual and calendar entries that describe the same event;
- deleted or disconnected calendar source after recommendation generation;
- a recommended item becoming unavailable before `I wore this`;
- partial wear where the customer changed shoes or removed a layer;
- repeated tap/retry on recommendation or `I wore this`;
- model timeout, malformed structured output, or unsupported item IDs;
- deterministic fallback with only one valid candidate;
- explicit preferences that make the wardrobe infeasible;
- accessibility/mobility requirement conflicting with a favorite item;
- uniform dressing preference where repetition is intentional;
- the customer choosing `More expressive` under non-negotiable practical constraints;
- cross-customer IDs and deleted wardrobe records;
- no image but sufficient text metadata;
- no weather, profile, history, or calendar—all at once—with a sufficient manual day and wardrobe.

## 20. Engineering handoff requirements

Engineering may begin using the approved decisions and architecture below. This section defines boundaries, not production code.

### 20.1 Domain boundaries

- Today's Edit owns the daily consultation and presentation.
- `DailyAgenda` owns normalized day context and conflict/source metadata.
- Wardrobe owns garment facts and canonical availability.
- User Profile owns explicit profile data, observed signals, and inferred preferences as separate classes.
- Recommendation Engine owns context resolution, eligibility, templates, scoring, challenger pass, validation, confidence, and explanation contracts.
- Wardrobe History owns confirmed wears.
- Calendar adapters may only feed `CalendarEvent` into the Daily Agenda builder.
- Weather is a server-side agenda/context enricher, not browser-supplied authority.
- Personal Shopper is not a dependency of Dress My Day.

No UI component may own or duplicate eligibility, scoring, availability, rotation, confidence, or learning rules.

### 20.2 Contracts to approve and version independently

- DailyAgenda and DailyAgendaItem schema, including user correction and conflict fields;
- context snapshot schema;
- availability states, freshness, timing, and canonical transition policy;
- occasion/dress-code taxonomy and evidence precedence;
- hard-eligibility reason codes;
- occasion-specific outfit completeness templates;
- factor scoring, contextual limits, bonuses/penalties, and missing-data redistribution;
- recommendation-confidence dimensions and presentation thresholds;
- structured candidate schema restricted to eligible owned IDs;
- explanation fact schema and final validation;
- recommendation outcome and feedback event taxonomy;
- wear-history idempotency and partial-wear behavior;
- retention, learning consent, deletion, reset, and export policies.

### 20.3 Required engine pipeline

1. Authenticate and authorize.
2. Build minimal consented context from `DailyAgenda` and documented enrichers.
3. Identify missing critical facts and decide whether to ask one question.
4. Resolve canonical availability at event time.
5. Apply deterministic hard eligibility.
6. Build complete baseline candidates from versioned templates.
7. Permit structured AI candidate construction using eligible IDs only.
8. Apply factor scores with evidence confidence and reason codes.
9. Run the “something better” challenger pass.
10. Calculate separate recommendation confidence.
11. Validate ownership, eligibility, completeness, constraints, and every explanation claim.
12. Return one primary candidate and at most one materially different alternative reference.
13. Persist a minimal versioned decision record and explicit outcomes transactionally.

### 20.4 Migration from current behavior

The current recommendation behavior must not become the permanent contract where it conflicts with this PRD. Engineering planning must explicitly address:

- migrating from event-specific recommendation routes toward a shared service that consumes `DailyAgendaItem` plus relevant day context;
- presenting one primary answer while allowing internal comparison of practical, expressive, and rotation candidates;
- removing “exactly three options” as a user-facing product requirement;
- replacing fixed recent-wear hard exclusion with governed recency scoring while keeping actual availability hard;
- replacing browser-supplied weather as authority with the documented server-side weather context in V1;
- implementing the explicit, reviewable category-aware availability suggestions defined for `I wore this`, with no availability mutation before customer confirmation;
- separating outfit score from recommendation confidence;
- expanding validation from item existence/diversity to full constraints, completeness, evidence, and explanation truth;
- persisting a compact decision snapshot, engine/rules/model versions, reason codes, and explicit outcome;
- preserving existing canonical data and avoiding duplicate event, outfit, availability, or preference stores.

### 20.5 Test and release gates

- Build synthetic scenario fixtures covering every state and edge case in this PRD.
- Test properties and valid ranges rather than demanding one exact outfit where several are legitimate.
- Add two-customer authorization coverage to every read, recommendation, correction, and wear mutation.
- Add prompt-injection, malformed output, fallback, replay/idempotency, stale-state, and concurrency tests.
- Confirm known-unavailable recommendation rate is zero before release.
- Conduct privacy, body-dignity, accessibility, and bias review before launch.
- Run product QA on real small wardrobes, repeated outfits, incomplete metadata, and disabled integrations—not only ideal populated accounts.
- Version every governed rule change and evaluate it against the stable scenario suite before deployment.

### 20.6 Delivery sequence

1. **Foundation gate:** approve technical contracts derived from this PRD and test deterministic eligibility, templates, scoring, and confidence without AI.
2. **Manual core:** route manual day context through `DailyAgenda`; deliver one validated recommendation, alternative behavior, correction, and confirmed wear.
3. **V1 weather:** add server-side, permissioned, freshness-aware weather through the documented context boundary and verify graceful operation when it is unavailable.
4. **Trust hardening and release:** complete decision records, consent/learning controls, empty/error states, accessibility, calibration instrumentation, security review, and scenario QA.
5. **Optional post-V1 calendar connection:** add read-only calendar sources only after their privacy and security gates are met. They must improve the same `DailyAgenda` contract, not create new recommendation paths.

## 21. Competitive Advantage Test

**Would this make Curated harder to copy if a well-funded competitor launched tomorrow? Yes—if implemented as specified.**

The visible “outfit of the day” can be copied easily. The durable advantage is the governed private-style record beneath it:

- trusted, permissioned `DailyAgenda` context independent of providers;
- canonical wardrobe availability and confirmed wear truth;
- explainable, versioned judgment rather than opaque generation;
- context-specific comfort, confidence, correction, and preference history;
- restrained advice that becomes more accurate without becoming more invasive;
- a long-lived archive distinguishing recommendation, selection, modification, and actual wear.

The moat compounds only when customer history is earned and correctable. More generated options do not create an advantage.

## 22. Brand Bible alignment

- **Private style house:** the experience begins with the customer's life and owned wardrobe, not software controls or commerce.
- **Discernment:** one recommendation demonstrates judgment; the alternative preserves agency.
- **Hospitality:** permissions, empty states, uncertainty, corrections, and errors receive first-class care.
- **Romance grounded in reality:** the Morning Note adds warmth, while weather, walking, laundry, fit, and dress code retain authority.
- **Recognition without surveillance:** personalization uses permissioned, bounded, reviewable evidence.
- **Stewardship:** rewearing and small wardrobes are respected; shopping is excluded.
- **Evolution without erasure:** explicit and learned preferences remain separate, contextual, time-aware, and correctable.
- **Confidence without authority theater:** Curated is decisive when evidence is strong and candid when it is not.
- **Maximalist with restraint:** garments and a specific lived explanation provide richness; hierarchy and actions remain disciplined.

## 23. Five evaluation questions

### 1. Does this strengthen Dress My Day?

**Yes.** It turns the feature from event-by-event outfit generation into a coherent daily consultation with one actionable answer, grounded in the full decision hierarchy and graceful missing-data paths.

### 2. Does this make the AI meaningfully smarter?

**Yes.** Intelligence comes from better normalized context, governed constraints, candidate comparison, calibrated confidence, explicit outcomes, and correctable longitudinal signals—not a broader prompt. V1 also records the evidence needed to improve future judgment without premature autonomous learning.

### 3. Does this improve customer trust?

**Yes.** It separates facts from inference, exposes assumptions, respects missing information, prevents unavailable-item recommendations, preserves manual paths, minimizes private data, and gives the customer clear correction and deletion control.

### 4. Does this align with the Brand Bible?

**Yes.** It behaves like an attentive private stylist: wardrobe-first, discreet, decisive, practical, body-respectful, hospitable in failure, and free from shopping pressure or false certainty.

### 5. Will this architecture still be correct in five years?

**Yes, with the specified governance.** Provider-neutral `DailyAgenda`, canonical domain ownership, independently versioned rules, deterministic validation, bounded AI, compact decision records, and distinct learning classes allow calendar, weather, travel, and future concierge capabilities to deepen the same system without duplicating logic. The boundaries are also credible for a ten-year product.

## 24. Final decision and resolved founder decisions

### 1. Decision

**Approve.** The product direction is coherent, durable, and ready for Engineering. Engineering must revise existing behavior where it conflicts with this PRD and preserve the governed architecture defined here.

### 2. The three most important product decisions

1. **One answer, not three equal choices.** Dress My Day presents a decisive primary look and reveals one materially different alternative on request.
2. **Rules decide; AI assists.** Ownership, availability, eligibility, templates, scoring, confidence, and validation remain governed and versioned. AI operates only on eligible owned IDs and supported facts.
3. **Manual-first with weather-aware trust.** `DailyAgenda` is mandatory as the product boundary; server-side weather ships in V1 but fails gracefully, while calendar connection remains optional and cannot create a separate recommendation path.

### 3. Founder decisions resolved

1. **V1 release boundary — resolved: include server-side weather; keep calendar optional.**
   - **Recommendation adopted:** V1 launches with manual agenda entry, optional current intention, and permissioned server-side weather. Calendar connections are not required for V1 and may follow through the same `DailyAgenda` boundary.
   - **Tradeoff:** weather adds an external dependency, privacy/consent work, caching, freshness, and failure handling. Excluding it would reduce delivery effort, but would allow Curated to recommend without checking one of the most consequential practical conditions.
   - **Brand Bible alignment:** romance must remain grounded in reality; beauty never overrides rain, temperature, walking, or comfort. Including weather earns trust. Graceful degradation preserves simplicity and ensures convenience never becomes coercive permission-seeking.

2. **Recent-wear policy — resolved: replace the fixed ten-day exclusion with soft, context-aware recency scoring.**
   - **Recommendation adopted:** confirmed recent wear informs exact/partial repetition, rotation, and wardrobe-utility scoring within governed caps. It is not a hard exclusion. Only canonical availability, explicit hygiene state, fit, safety, dress code, ownership, or logistics may make an item ineligible.
   - **Tradeoff:** a soft rule requires better candidate scoring and may occasionally repeat a look. A fixed exclusion is easier to implement and creates surface-level variety, but it fails small wardrobes, uniform dressers, travel contexts, and days when the repeated look is plainly best.
   - **Brand Bible alignment:** stewardship means treating rewearing as confidence and continuity, not failure. The softer rule favors judgment over novelty and respects the wardrobe the customer actually owns.

3. **Wear-to-laundry policy — resolved: use visible category-aware suggestions with explicit confirmation.**
   - **Recommendation adopted:** `I wore this` opens one compact review of the pieces actually worn and their proposed availability states. Hygiene-obvious categories default to `laundry`; durable accessories and outerwear default to `available`; context-dependent garments require a visible choice when their next state is unknown. The customer may change every suggestion before one `Save wear` action. No silent availability update is permitted.
   - **Tradeoff:** the review adds a small amount of friction after wear. Automatically dirtying everything is simpler but inaccurate and unnecessarily removes garments; leaving everything available is frictionless but makes future recommendations unreliable. Explicit, editable suggestions produce better wardrobe truth without pretending Curated knows private care habits.
   - **Brand Bible alignment:** this is trust before convenience and recognition without surveillance. The experience offers prepared assistance while preserving customer agency, dignity, and control.

### 4. Remaining founder decisions

**None required before Engineering begins.** Normal technical contract review, security review, and delivery estimation remain Engineering responsibilities; they must not reopen the product decisions above without new evidence or a documented conflict.
