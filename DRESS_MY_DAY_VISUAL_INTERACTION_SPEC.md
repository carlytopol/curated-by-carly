# Dress My Day V1 — Visual and Interaction Specification

> **V2 authority notice — July 29, 2026:** This document remains the presentation authority. Where option counts, uncertainty states, correction outcomes, or recommendation authority conflict, `RECOMMENDATION_QUALITY_ROADMAP.md` and `RECOMMENDATION_ARCHITECTURE_V2.md` govern. The experience must honestly support recommend, revise, ask, and abstain outcomes.

**Status:** Design specification for review  
**Product contract:** `DRESS_MY_DAY_V1_PRD.md`  
**Brand contract:** `BRAND_BIBLE.md`  
**Scope:** Layout, editorial hierarchy, typography, color, imagery, motion, states, microcopy, and delight.  
**Behavioral constraint:** This document does not add, remove, or change product behavior. Where it appears to conflict with the PRD, the PRD governs.

## 1. Creative Direction

Dress My Day should feel like arriving at a beautifully prepared dressing table shortly after breakfast. The day has already been considered. The wardrobe has been quietly checked. Nothing is scattered across the room, and no one is asking the customer to do the stylist’s work.

The experience is:

- a consultation, not a dashboard;
- a composed editorial page, not a stack of software cards;
- visually rich where the wardrobe appears and restrained where decisions are made;
- feminine through intelligence, materiality, and hospitality rather than decoration;
- decisive without becoming severe;
- romantic without losing weather, walking, laundry, fit, or accessibility reality.

### Governing design sentence

> The day arrives as a note; the answer arrives as a composition.

### Emotional sequence

1. **Received** — “Curated knows which day I am entering.”
2. **Oriented** — “It understands the shape of the day.”
3. **Consulted** — “My intention matters, but I am not being interviewed.”
4. **Considered** — “The wardrobe is being checked carefully.”
5. **Answered** — “One look has been chosen for a reason.”
6. **Remembered** — “What I actually wore becomes part of my history.”

## 2. Non-Negotiable Product Behavior

The visual design must preserve the following PRD decisions:

- one primary day-level recommendation;
- at most one materially different alternative;
- `DailyAgenda` as the sole schedule representation;
- manual day description as a complete path without calendar connection;
- weather as secondary, permissioned context that may fail gracefully;
- optional intention with the four approved choices and free text;
- no more than one decision-changing question at a time;
- only owned, eligible garments in a recommendation;
- `Another option`, `Previous option`, and `Change something` behavior as specified;
- an explicit review before recording `I wore this`;
- transparent, per-item availability choices before `Save wear`;
- no shopping suggestion from an empty or incomplete wardrobe state;
- no scores, confidence percentages, AI language, gamification, streaks, or infinite alternatives;
- manual correction and privacy control even when integrations are present.

Visual hierarchy may conceal complexity until it is useful. It must never conceal a consequential choice, inferred assumption, privacy boundary, or data mutation.

## 3. Experience Architecture

Dress My Day has three visual acts and four supporting surfaces.

### Act I — The day

The opening consultation contains:

1. date-aware welcome;
2. natural-language summary of the day;
3. secondary weather context when available;
4. optional intention;
5. `Dress me for today`;
6. quiet `Review today` access.

### Act II — The consideration

After the primary action, the visible day remains in place while the recommendation area prepares. If Curated needs one decision-changing answer, the focused question occupies this act.

### Act III — The edit

The recommendation becomes the editorial focal point:

1. look title;
2. complete garment composition;
3. Morning Note;
4. why the look works;
5. practical or assumption note when relevant;
6. `I wore this`;
7. `Another option` and `Change something`.

### Supporting surfaces

- **Review Today** — focused agenda review and correction;
- **Change Something** — scoped correction flow;
- **Wear Review** — confirmation of actual pieces and availability;
- **Reflection** — optional sampled feedback after a saved wear.

These surfaces use the same visual grammar but are quieter than the main edit. They should feel like opening a drawer or placing a note beside the composition—not navigating into another application.

## 4. Page Layout

### 4.1 Global frame

The page sits within the authenticated application shell but visually behaves as a single editorial feature.

- Maximum content width: `80rem` / `1280px`.
- Primary reading width: `42rem` / `672px`.
- Garment composition width may extend to `72rem` / `1152px`.
- Desktop outer padding: `48–72px`, responsive to viewport.
- Tablet outer padding: `32px`.
- Mobile outer padding: `20px`; never below `16px` on narrow devices.
- Major vertical intervals: `72–112px` desktop, `48–72px` mobile.
- Text-section intervals: `24–40px`.
- Minimum touch target: `44 × 44px`.

The background may carry subtle paper grain and one extremely low-contrast atmospheric color field. It must not reduce text contrast, cause banding, or make garment colors unreliable.

### 4.2 Opening composition — desktop

Use an asymmetric 12-column grid.

- Columns 1–7: welcome, day summary, intention, and primary action.
- Columns 9–12: weather, optional quotation, and `Review today` disclosure.
- Column 8 remains breathing room rather than a divider.
- The date and welcome begin high on the page, not vertically centered like a marketing hero.
- `Dress me for today` aligns with the main reading column, never floats as a detached call to action.

The right rail must not become a utility dashboard. Weather is one compact text composition, not a multi-metric card. The quotation is omitted when the viewport or content density would compete with the day.

### 4.3 Opening composition — tablet

- Use an 8-column grid.
- Welcome and day summary span all columns.
- Weather and quotation form a quiet two-column row beneath the summary when space permits.
- Intention and primary action remain in a single reading column.
- `Review today` appears adjacent to the day summary, not isolated at the bottom.

### 4.4 Opening composition — mobile

Use one continuous column in this order:

1. eyebrow: `Today’s Edit`;
2. local date;
3. welcome;
4. day summary;
5. `Review today`;
6. weather note, if available;
7. intention control;
8. `Dress me for today`;
9. quotation only if it remains above the recommendation boundary without pushing the action below the initial useful viewport.

The main action may become full width on mobile. It must remain in document flow and must not be a permanently sticky bottom bar. Safe areas are respected.

### 4.5 Recommendation composition — desktop

The transition from the day to the result should feel like a page turn within the same consultation.

- Place a fine editorial rule or generous vertical interval between context and recommendation.
- Use a 12-column composition:
  - look title and Morning Note: columns 1–5;
  - garment composition: columns 5–12, with controlled overlap only at large breakpoints;
  - explanation and notes: columns 1–5 beneath the title;
  - actions: columns 1–5, following the explanation.
- Do not enclose the entire recommendation in a rounded rectangle.
- Garment imagery provides the visual mass; prose provides the judgment.

### 4.6 Recommendation composition — mobile

Use this order:

1. result eyebrow;
2. look title;
3. Morning Note;
4. garment composition;
5. complete item list where labels are needed;
6. `Why this works`;
7. practical or assumption note;
8. `I wore this`;
9. `Another option` and `Change something`.

The garment composition may use horizontal overflow only if all items remain understandable without swiping. The preferred mobile treatment is a bounded editorial mosaic or vertically stepped sequence, not a carousel.

## 5. Editorial Hierarchy

### Level 1 — The lived day

The primary information is not the feature name. It is the customer’s day.

- `Today’s Edit` is a small recurring rubric.
- The date is legible and dignified.
- The welcome is emotionally warm but brief.
- The day summary carries the greatest opening-screen editorial weight.

Example:

> Good morning, Carly.
>
> A client meeting at ten, then dinner at seven.

### Level 2 — Curated’s answer

Once generated, the look title becomes the page’s strongest display text. It should name the composition rather than describe a vague mood.

Prefer:

- `Soft tailoring, carried into evening`
- `The navy dress, grounded for rain`
- `A polished foundation with one evening change`

Avoid:

- `Your perfect look`
- `Effortless elegance`
- `Chic & sophisticated`
- `AI recommendation #1`

### Level 3 — The Morning Note

The Morning Note is the emotional hinge and should appear immediately after the look title. It is not a label plus body-copy module. Treat it like a brief line from the stylist, set with visual intimacy.

Example:

> Keep the navy trousers through dinner; the velvet jacket is the only change worth carrying.

### Level 4 — Evidence

`Why this works`, practical instructions, and assumptions support the answer. They are clear and easy to scan but never compete with the garments or title.

### Level 5 — Controls and provenance

Source labels, inferred dress code, weather freshness, correction access, and alternative navigation remain visible when relevant but occupy the quietest level consistent with trust and accessibility.

## 6. Typography

### 6.1 Typographic roles

Use three roles, with no more than two font families:

1. **Editorial display serif** — welcomes, day summaries, look titles, Morning Note.
2. **Humanist text face** — explanations, form labels, controls, errors, privacy copy.
3. **Small editorial notation** — the text family in uppercase or small caps for dates, rubrics, sources, and section labels.

The final families belong to the identity phase. This specification defines behavior independent of a specific typeface.

### 6.2 Scale

| Role | Desktop | Mobile | Guidance |
| --- | ---: | ---: | --- |
| Look title | 56–72px / 0.98–1.05 | 38–48px / 1.02–1.08 | 8–13 words preferred |
| Day summary | 42–56px / 1.05–1.12 | 32–40px / 1.08–1.15 | Natural sentence casing |
| Welcome | 26–34px / 1.15 | 23–28px / 1.18 | Secondary to day summary |
| Morning Note | 24–32px / 1.3 | 21–26px / 1.35 | Italic only if highly readable |
| Section heading | 20–24px / 1.25 | 19–22px / 1.3 | Serif or text-face semibold |
| Body | 16–18px / 1.55–1.7 | 16–17px / 1.55–1.65 | Never below 16px for core copy |
| Control | 14–16px / 1.2 | 15–16px / 1.2 | Medium weight, sentence case |
| Notation | 11–13px / 1.3 | 11–12px / 1.3 | Tracking 0.10–0.16em |

### 6.3 Rules

- Never use light weights for body text or critical controls.
- Avoid all-uppercase sentences; reserve uppercase for short notations.
- Do not letter-space display serif text.
- Keep body copy to approximately `45–68` characters per line.
- Avoid center alignment for explanations, forms, errors, or multi-line actions.
- Use tabular numerals for times and weather values where available.
- Curly punctuation and typographic apostrophes are preferred in editorial copy.
- Text zoom to 200% must not truncate, overlap, or conceal actions.

## 7. Color System

### 7.1 Role-based palette

Dress My Day uses the brand world through controlled color roles rather than decorating each module differently.

| Role | Working token | Working value | Use |
| --- | --- | --- | --- |
| Parchment canvas | `--dmd-canvas` | `#F5EFE4` | Page ground |
| Petal paper | `--dmd-paper` | `#FFFDF8` | Focused sheets, forms, image labels |
| Garden ink | `--dmd-ink` | `#24372F` | Primary type and primary action |
| Charcoal | `--dmd-charcoal` | `#34332F` | Long reading |
| Moss | `--dmd-moss` | `#697064` | Secondary text, weather |
| Oxblood | `--dmd-oxblood` | `#653348` | Intimate accent, Morning Note marker |
| Old rose | `--dmd-rose` | `#DCC3C6` | Selected soft states, atmospheric field |
| Aged brass | `--dmd-brass` | `#9A7845` | Focus, fine rules, rare emphasis |
| Linen rule | `--dmd-rule` | `rgba(91, 70, 47, .22)` | Dividers, borders |
| Quiet success | `--dmd-success` | `#E8F0E8` | Saved-wear acknowledgment |
| Quiet warning | `--dmd-warning` | `#F5EADB` | Provisional or missing context |
| Quiet error | `--dmd-error` | `#8A3F4E` | Error text and recovery states |

Values are working specifications and must be tested against the final type system and photography before token adoption.

### 7.2 Color discipline

- Parchment and paper create warmth; neither should appear yellow or “vintage.”
- Forest/garden ink is the principal dark and should not be used as a large decorative field behind garment photography unless contrast and color fidelity are protected.
- Oxblood marks intimacy or correction, not danger.
- Brass is a line, focus ring, or rare small detail—not metallic-gradient decoration.
- Garment images must not receive palette-wide color filters.
- Selected intention chips may use pale rose, moss, or paper with a strong ink outline; selection cannot rely on hue alone.
- Errors use iconography or labels plus color, never red alone.
- All text and interactive states must meet WCAG AA; aim for AAA for body copy on canvas and paper.

## 8. Imagery and Garment Composition

### 8.1 Principle

The owned clothes are the portrait of the customer. The interface should treat them as a personal collection, not product inventory.

### 8.2 Recommendation imagery

- Use the customer’s private garment photography wherever available.
- Never substitute aspirational stock garments for an owned item.
- Never manufacture a body or virtual try-on.
- Text-only garments remain first-class and use the same compositional footprint with a tactile paper label, category, color, and item name from known metadata.
- Preserve garment color accuracy; texture overlays sit outside images, not over them.
- Avoid e-commerce price-card conventions, badges, rating marks, and dense metadata beneath images.

### 8.3 Desktop composition

Compose the full outfit as an editorial still life:

- one dominant garment image establishes the silhouette;
- supporting pieces use smaller but legible scales;
- shoes and bags may anchor the lower edge;
- outerwear may sit behind the primary garment if overlap does not obscure recognition;
- each item remains individually focusable and linked to its wardrobe detail;
- spatial placement must not imply unsupported physical scale.

Use a consistent composition algorithm so loading and final positions are stable. The arrangement may feel art-directed but cannot depend on manual per-outfit design.

### 8.4 Mobile composition

- Use a two-column or stepped mosaic with one featured item spanning both columns when appropriate.
- Maintain at least `12px` visual separation between tap regions even when images overlap optically.
- Labels appear on focus/tap or beneath images; essential identity never exists only in hover.
- If there are many support items, place the principal outfit first and secondary accessories in a clearly connected row.

### 8.5 Image treatment

- Preferred asset ground: transparent, warm-neutral, or naturally photographed backgrounds.
- Crop object imagery generously; do not clip hems, shoes, handles, or distinctive construction unnecessarily.
- Border radius: subtle (`4–12px`) for photography, not universal pill softness.
- Shadow: broad and nearly imperceptible; images should feel placed, not floating like commerce tiles.
- Missing or low-quality photographs are acknowledged neutrally, never described as inferior.

### 8.6 Decorative imagery

Dress My Day does not require stock lifestyle photography in the core consultation. Atmospheric botanical, architectural, or object imagery may appear only in editorial interludes such as the optional quotation, and only when it does not compete with the customer’s wardrobe.

## 9. Component Specifications

### 9.1 Date-aware welcome

**Content order:** rubric → date → welcome → day summary.

- Rubric: small notation in brass or moss.
- Date: text-face notation or small serif, never a calendar icon tile.
- Welcome: editorial serif, intimate but not oversized.
- Day summary: largest opening text.
- If first name is unavailable, use `Good morning.` without placeholder language.
- Time-of-day greeting follows the customer’s local timezone.

### 9.2 Today’s shape

- Render as natural language, not event cards by default.
- Highlight time only through weight or tabular numerals—not colored chips.
- A source disclosure appears only where needed, beneath the relevant phrase or within Review Today.
- Inferred occasion or dress code must use plain copy such as `Treated as polished business` with `Review` access; do not display machine confidence scores.
- Conflicts use a quiet editorial marker and direct language, not an alarming banner unless safety requires it.

### 9.3 Review Today action

- Style as a text action with a fine underline or discreet arrow.
- Place directly after the day summary.
- Accessible name should communicate destination: `Review today’s plans`.
- It opens the focused Review Today surface and restores focus to its trigger on close.

### 9.4 Weather note

When available, show only styling-relevant context:

- current or relevant temperature range;
- concise condition;
- precipitation or wind only when meaningful;
- location/freshness disclosure in the quietest text level.

Do not use a forecast dashboard, hourly chart, oversized weather icon, or decorative animation. A small line-drawn weather mark is acceptable if it improves scanning and has hidden decorative semantics.

Example:

> 54–63° · Rain likely after six  
> Brooklyn · updated moments ago

### 9.5 Intention control

Label:

> How would you like to feel?

Display the four choices as compact text controls:

- `At ease`
- `Assured`
- `Polished`
- `More expressive`

Rules:

- Use a single-select group with visible `aria-pressed` or radio semantics.
- Default is visually selected without implying a permanent preference.
- Optional free text appears through one quiet text affordance and remains session-scoped.
- Selection motion is a quiet border/fill settle, not a bouncing chip.
- Include nearby quiet copy when needed: `For today only.`

### 9.6 Primary action

Label: `Dress me for today`.

- Primary action uses garden ink with paper text.
- Desktop: intrinsic width with generous horizontal padding.
- Mobile: full width is preferred.
- Minimum height: `52px` mobile, `48px` desktop.
- Shape: softened rectangle or restrained capsule; avoid exaggerated pill proportions.
- Hover: subtle darkening and one-pixel lift.
- Active: return to plane or depress one pixel; never scale dramatically.
- Disabled/loading: preserve legibility and dimensions; do not fade below readable contrast.

### 9.7 Optional quotation

- The quotation is editorial atmosphere, never the page headline.
- Maximum two short lines plus attribution.
- Correct attribution is mandatory.
- It remains fixed for the session/day.
- Omit when viewport height, zoom, translation, or content density makes it compete with the primary action.
- Do not use quotation marks as oversized decoration.

### 9.8 Focused question

- Replace the action area with one clearly framed question while preserving visible day context.
- Use a paper surface with a fine rule or subtle inset—not a conversational chat bubble.
- Present only valid answers and the PRD-permitted skip/provisional path.
- State why the answer matters in one short sentence.
- On response, announce continuation and proceed automatically.

Example:

> One detail will change the answer.  
> Is the wedding black tie?

### 9.9 Recommendation title and Morning Note

- Rubric: `Today’s recommendation` or `Today’s Edit`.
- Look title: Level 1 display treatment.
- Morning Note: set below with an oxblood hairline, small house mark, or typographic indent—not a quote card.
- Do not label it `AI insight`, `Stylist says`, or `Tip`.
- The note must disappear rather than use generic filler when no specific evidence-based sentence can be written.

### 9.10 Why this works

- Heading: `Why this works`.
- Two or three sentences as defined by the PRD.
- Do not separate each factor into dashboard rows.
- Occasion, weather, movement, comfort, and wardrobe logic should read as one considered judgment.
- Any assumption appears after the reasoning as a distinct but calm note.

### 9.11 Practical note

Use only when actionable.

- Introduce with a concise label such as `For later` or `One thing to carry`.
- Use a soft paper inset, hairline, or side note.
- Do not use warning styling for ordinary rain, layers, or shoe changes.

### 9.12 Confidence or assumption note

- High confidence: show nothing.
- Medium confidence: sentence in quiet warning ground or beside a brass rule.
- Low confidence: use the focused-question state before generation where possible.
- Never use a meter, percentage, stars, or “high/medium/low confidence” badge.

Example:

> I have treated dinner as polished, but not formal. Review the dress code if that is not right.

### 9.13 Outcome and secondary actions

Visual order:

1. `I wore this` — primary;
2. `Another option` — secondary outline/text;
3. `Change something` — tertiary text.

On mobile, stack the primary action full width and place secondary actions beneath with sufficient separation. Do not make all three equal pills.

After revealing the alternative:

- identify it with `Another way` or `Alternative`, subordinate to its actual look title;
- use a page-level dissolve/recomposition, not horizontal carousel behavior;
- replace `Another option` with `Previous option` according to the PRD;
- keep `Change something` available;
- never add dots, `1 of 3`, swipe affordances, or endless regeneration cues.

### 9.14 Review Today surface

Use a side sheet on desktop and a full-height bottom sheet or page-like sheet on mobile.

- Desktop maximum width: `480–560px`.
- Mobile: full viewport width with safe-area padding and a visible close control.
- Header remains visible while its content scrolls.
- Manual plans support existing add/edit/remove behavior.
- Read-only events appear visually distinct through provenance copy, not disabled-looking low opacity.
- Correction of inferred occasion/dress code stays adjacent to the inference.
- Exclusion is framed as `Leave out of today’s edit`, not deletion.
- Destructive actions require clear labels and sufficient separation from primary actions.
- Focus is trapped while open and returned on close.

### 9.15 Change Something surface

Open with the six approved reasons in one vertical list. Avoid icon grids.

- Each reason uses a clear title and optional one-line explanation only when ambiguity exists.
- `Just today` is the default scope and appears before any persistence choice.
- `Remember for similar days` requires explicit selection and a concise explanation of what will be remembered.
- Item replacement uses the same garment visual language as the recommendation, not a dense closet grid.
- Confirm canonical availability changes before saving.
- After correction, return to the recommendation with the revised garment or rationale visibly settled into place.

### 9.16 Wear Review sheet

This is a consequential review, visually calm and unmistakably explicit.

- Title: `Confirm what you wore`.
- Show date and look title.
- Display actual recommended items as an ordered list with thumbnails where available.
- `I did not wear this` is adjacent to each item.
- Availability choices are clear two-state controls: `Available again` and `Laundry`.
- Proposed states may be preselected only according to the PRD’s category-aware rules.
- State: `Nothing changes until you save.`
- `Save wear` is primary; `Not yet` is secondary.
- If no items remain, disable `Save wear` and explain why without blame.
- Revalidate before saving and surface changed availability against the relevant item.

### 9.17 Optional reflection

After saving, acknowledge first. Offer reflection only when sampled.

Prompt: `How did it feel?`

- `At ease`
- `Assured`
- `Not quite me`
- `Something was off`

This is a small paper note beneath the saved acknowledgment, not a blocking modal. It must be dismissible without negative signal.

## 10. Motion

### 10.1 Motion character

Motion should feel like paper settling, a curtain being drawn, or garments being laid out—not an app celebrating computation.

### 10.2 Timing

| Motion | Duration | Curve |
| --- | ---: | --- |
| Hover/focus color | 120–160ms | ease-out |
| Control selection | 160–220ms | ease-out |
| Sheet enter/exit | 240–320ms | standard emphasized ease |
| Recommendation reveal | 420–650ms | decelerating ease |
| Garment settle | 360–560ms, slight stagger | decelerating ease |
| Saved acknowledgment | 240–360ms | ease-out |

Stagger is capped at approximately `40–60ms` per garment and `240ms` total. The customer should not wait for choreography to finish before interacting.

### 10.3 Recommendation reveal

1. Loading copy resolves.
2. A fine rule or tonal field becomes visible.
3. The look title fades upward by no more than `8px`.
4. Garments settle from opacity and `4–10px` positional offsets.
5. The Morning Note and explanation appear together or immediately afterward.
6. Focus moves only if necessary for accessibility; otherwise scroll the result into a comfortable viewport position without stealing keyboard focus.

No shimmer sweep, sparkling particles, typewriter effect, garment fly-in, dramatic zoom, or simulated AI thinking.

### 10.4 Alternative transition

The first composition softens to approximately `35%` opacity, then the alternative recomposes in place. Do not animate off-screen as a carousel because the first answer remains conceptually available, not discarded.

### 10.5 Reduced motion

Under `prefers-reduced-motion: reduce`:

- replace transforms and stagger with immediate or short opacity changes;
- disable smooth scrolling;
- open sheets without travel animation;
- preserve all state and focus announcements;
- never make motion necessary to understand what changed.

## 11. Loading and Perceived Care

Preserve the day context and action footprint. Use the approved, truthful sequence:

1. `Considering the day`
2. `Checking what is available`
3. `Composing the look`

### Visual treatment

- One status line occupies a stable area beneath or in place of the action.
- A thin rule may fill in three discrete stages only if it reflects actual pipeline progress; otherwise use no progress indicator.
- The garment area may show static paper silhouettes matching the final layout, not animated skeleton shimmer.
- Use `aria-live="polite"` for meaningful stage changes and avoid repeated announcements.
- Disable duplicate submission while preserving the customer’s intention and day.

Long-running state:

> This is taking longer than it should.

Action: `Try again`.

Do not say “Our AI is thinking,” invent percentages, or rotate whimsical messages unrelated to actual work.

## 12. Empty and Exceptional States

Every state should preserve three things: what Curated knows, what it cannot responsibly do, and the single best next step.

### 12.1 Empty wardrobe

**Composition:** generous single-column note with one small empty wardrobe illustration or quiet textile/wood detail; no empty grid.

**Copy:**

> Your wardrobe is still waiting for its first pieces.
>
> Begin with a few things you reach for often; that is enough for Curated to start being useful.

Primary: `Add a piece`  
Secondary: `How much do I need?`

The guidance opens as a short note, not a completion checklist. No store imagery or shopping language.

### 12.2 No agenda

**Heading:** `What shape will today take?`

Choices:

- `A usual day`
- `Working from home`
- `Out and about`
- `Add a plan`

Add the permitted short-description field. Present choices as a vertical list or two-column mobile-safe arrangement, not dashboard tiles.

### 12.3 Weather unavailable

Keep weather’s reserved footprint small.

**Copy:**

> I could not confirm the weather, so I have kept the layer adaptable.

Actions: `Add location` and `Try weather again`.

If a result is already possible, this appears as a note, not an error panel.

### 12.4 Low confidence

Use the focused-question pattern. If the customer skips and a provisional result is valid, mark the single assumption in prose after the explanation. Avoid yellow banners, confidence meters, and repeated caveats.

### 12.5 Conflicting events

**Heading:** `Two parts of the day ask for different things.`

- When one base plus a change works, show the base as the recommendation and the minimum change as the practical note.
- When priority is unclear, ask: `Which part of the day should lead the decision?`
- Do not visualize a complex timeline unless timing itself is required to understand the conflict.

### 12.6 No eligible outfit

**Heading:** `I cannot make a complete recommendation from what is available today.`

Follow with the known reason, never a generic failure. Show only relevant actions from:

- `Review availability`
- `Correct the dress code`
- `Relax today’s preference`
- `Build from what is available`

Do not show an empty hanger, sad face, red alert field, or Personal Shopper link.

### 12.7 Recommendation error

**Copy:**

> I could not complete today’s edit. Your day and wardrobe changes are safe; please try once more.

Primary: `Try again`.

The day remains visible. Technical details remain hidden.

### 12.8 Calendar source error

In Review Today, mark only the affected source:

> This calendar could not be refreshed. Your manual plans are still here.

The main consultation remains usable.

### 12.9 Persistence error after generation

Keep the recommendation visible.

> This edit is here, but I could not save it yet.

Action: `Try saving again`.

Never visually imply that History or availability has changed until persistence succeeds.

### 12.10 Authentication or ownership error

Use a neutral privacy-preserving state. Do not reveal whether a referenced record exists.

> Please sign in again to continue privately.

Action: `Sign in`.

## 13. Microcopy System

### 13.1 Voice rules

- Lead with the useful truth.
- Use `I` only when Curated is offering a considered judgment or acknowledging a limitation.
- Use `we` sparingly; do not imply a human reviewed a result unless one did.
- Address the customer as `you`, never `user`.
- Prefer active, concrete verbs.
- Avoid praise unrelated to evidence.
- Never dramatize ordinary failures.
- Never make missing data feel like customer negligence.
- Never call a generated result magical, perfect, instant, or effortless.

### 13.2 Core approved labels

| Purpose | Copy |
| --- | --- |
| Feature rubric | `Today’s Edit` |
| Primary action | `Dress me for today` |
| Day review | `Review today` |
| Intention prompt | `How would you like to feel?` |
| Recommendation evidence | `Why this works` |
| Alternative | `Another option` |
| Return to first | `Previous option` |
| Correction | `Change something` |
| Wear outcome | `I wore this` |
| Wear confirmation | `Confirm what you wore` |
| Wear persistence | `Save wear` |
| Cancel wear review | `Not yet` |
| Saved acknowledgment | `Remembered for today.` |
| Reflection | `How did it feel?` |

### 13.3 Writing patterns

**Recommendation title:** concrete composition + purpose or transition.

> The silk blouse, softened for a long day

**Why this works:** occasion → practicality → personal/wardrobe reason.

> The navy trousers and ivory blouse are polished enough for the presentation without becoming rigid at dinner. The loafers are the wiser choice for the walk, and the velvet jacket gives the evening distinction without requiring a full change.

**Assumption:** fact being assumed + correction path.

> I have treated the dinner as polished but not formal. Review today if that is not right.

**Unavailable item correction:** consequence without blame.

> I will leave the loafers out today and compose the look again.

**No materially different alternative:** confident limitation + agency.

> This is the strongest complete look in the wardrobe for today. I can adjust one part if you tell me what feels off.

### 13.4 Prohibited copy patterns

- `We found the perfect outfit!`
- `You’re going to look amazing.`
- `Level up your look.`
- `Your wardrobe is incomplete.`
- `You wore this too recently.`
- `AI confidence: 92%.`
- `Oops! Something went wrong.`
- `Add these must-haves.`
- `Treat yourself.`
- `You always…` unless supported, relevant, and reviewable.

## 14. Delight Moments

Delight should emerge from recognition and care, not reward mechanics.

### 14.1 The Morning Note

The signature delight moment. It links the outfit to the actual lived day with one specific, useful sentence. Its power comes from truth and timing.

### 14.2 The wardrobe settling into place

When the answer resolves, owned pieces arrange into a complete composition. The customer recognizes her own wardrobe becoming newly legible. This is the principal visual reveal.

### 14.3 The useful restraint

When an alternative would be weaker, Curated says so calmly. Refusing to manufacture variety is a memorable proof of judgment.

### 14.4 The thoughtful transition

For a compatible multi-event day, one precise instruction—remove the knit, carry the velvet jacket, change only the shoes—creates delight through preparedness rather than spectacle.

### 14.5 Remembered for today

After `Save wear`, the look settles visually: color becomes slightly quieter, the date appears as an archival notation, and the message `Remembered for today.` is revealed. No confetti, sound burst, badge, count, or streak.

### 14.6 Gentle recognition over time

Where supported by existing product behavior and approved evidence, the explanation may note a relevant confirmed connection:

> These are the trousers you felt most at ease in on your last long client day.

This is not a new behavior mandate. It is the visual and verbal treatment when such supported reasoning is already part of the recommendation.

## 15. Accessibility and Inclusive Luxury

Accessibility is part of the hospitality standard, not a later compliance layer.

- Semantic heading order follows the editorial hierarchy.
- Every garment has meaningful alt text based only on known facts.
- Text-only garment representations are equivalent, not degraded placeholders.
- Keyboard order follows reading order even when the desktop composition overlaps visually.
- Focus rings use aged brass against both paper and dark actions and meet contrast requirements.
- Sheets trap focus, support Escape, label close controls, and restore focus.
- Status updates use appropriate `role="status"`, `aria-live`, or `role="alert"` without repetition.
- Choice controls expose name, state, and scope.
- Color is never the sole signal.
- Touch targets meet `44px` minimum and do not overlap.
- Body copy remains at least `16px` and tolerates 200% text zoom.
- The interface supports reduced motion and increased contrast.
- Garment mosaics expose a logical list representation to assistive technology.
- Dates, temperatures, units, and time formats respect locale and customer preference.
- Mobile layouts support safe areas, orientation changes, and device text enlargement.
- Romantic texture and layering may be removed without impairing the complete task.

## 16. Responsive Behavior

### Breakpoint principles

Breakpoints should follow content stress rather than device labels. Working ranges:

- Compact: `< 640px`
- Intermediate: `640–1023px`
- Wide: `≥ 1024px`
- Editorial wide: `≥ 1280px`

### Compact

- One reading column.
- Full-width primary action.
- Garment mosaic uses no more than two columns.
- Sheets rise from the bottom or occupy the full content viewport.
- Secondary metadata collapses into plain disclosure lines.
- No hover-dependent content.

### Intermediate

- Day context remains primarily single-column.
- Weather and quotation may share a row.
- Recommendation can use a 5/3 or 4/4 split where garment images remain legible.
- Sheets may remain bottom-aligned on touch devices.

### Wide

- Use asymmetric day and recommendation compositions.
- Keep the primary reading column bounded.
- Allow controlled garment overlap without changing DOM order.
- Review and correction use side sheets.

### Very wide

- Do not keep expanding line lengths or garment gaps.
- Center the bounded editorial canvas.
- Atmospheric negative space may grow; functional components should not.

## 17. Interaction and Focus Rules

- On initial load, focus remains at the document start; do not auto-focus intention or day inputs.
- Opening Review Today, Change Something, or Wear Review moves focus to the surface heading.
- Closing a surface returns focus to the invoking control.
- After a focused question is answered, announce that Curated is continuing.
- When the recommendation appears, announce `Today’s edit is ready`; do not read the full explanation automatically.
- `Another option` preserves the first option in state and updates its own label to `Previous option`.
- If there is no alternative, focus moves to the explanatory message and `Change something` remains available.
- After saving a wear, focus moves to the `Remembered for today.` status or remains on the confirmation action with the status announced.
- Repeated taps are idempotent and visibly disabled while processing.
- Inline validation appears beside the relevant input and is summarized at the surface heading when necessary.

## 18. Content Density Rules

To preserve “maximalist with restraint”:

- never show more than one dominant editorial statement per viewport;
- show no more than one primary action per state;
- keep initial intention choices to the four approved options;
- keep weather to one or two useful facts plus provenance;
- keep the Morning Note to one sentence;
- keep `Why this works` to two or three sentences;
- show practical and assumption notes only when relevant;
- show calendar source only where trust requires it;
- keep alternative comparison sequential, never side-by-side on mobile;
- use texture in the canvas and editorial pauses, not behind dense forms;
- reserve ornamental imagery for moments without decision load.

## 19. Design Tokens and Implementation Guidance

This specification does not require immediate token or component changes, but implementation should eventually express reusable semantic roles:

```text
color.dmd.canvas
color.dmd.paper
color.dmd.ink
color.dmd.text
color.dmd.muted
color.dmd.intimate
color.dmd.rule
color.dmd.focus
color.dmd.success
color.dmd.warning
color.dmd.error

type.dmd.rubric
type.dmd.date
type.dmd.welcome
type.dmd.daySummary
type.dmd.lookTitle
type.dmd.morningNote
type.dmd.body
type.dmd.control

space.dmd.inline
space.dmd.section
space.dmd.act

motion.dmd.control
motion.dmd.sheet
motion.dmd.reveal
motion.dmd.settle
```

Component names should describe product roles rather than ornamental appearance, for example `DaySummary`, `IntentionSelector`, `RecommendationComposition`, `MorningNote`, `AssumptionNote`, and `WearReviewSheet`.

## 20. Visual QA Matrix

Each state must be reviewed at minimum at:

- `320 × 568` with browser text enlarged;
- `390 × 844` representative modern phone;
- `768 × 1024` tablet portrait;
- `1024 × 768` compact landscape/tablet;
- `1440 × 900` desktop;
- `1728 × 1117` wide desktop;
- 200% text zoom;
- keyboard-only navigation;
- screen reader spot check;
- reduced motion;
- increased contrast where supported;
- light appearance only for V1 unless a dark appearance is explicitly added in a future product requirement.

Test all widths with:

- long first name;
- long translated-style day summary even if localization is later;
- no first name;
- no garment photography;
- one complete outfit with many support items;
- very long garment names;
- weather available and unavailable;
- medium-confidence assumption;
- read-only and manual agenda items together;
- visible error plus preserved recommendation;
- mobile safe-area insets and on-screen keyboard.

## 21. State-by-State Acceptance Checklist

### Opening consultation

- The day, not the product name, owns the opening hierarchy.
- One primary action is unmistakable.
- Weather remains secondary.
- Intention is optional and clearly session-scoped.
- Review Today is discoverable without reading as a competing action.
- The page does not resemble a dashboard.

### Focused question

- Exactly one consequential question is visible.
- The reason for asking is understandable.
- A skip/provisional path appears only where the PRD permits it.
- Day context remains visible.
- Response continues automatically.

### Recommendation

- One look is dominant.
- Every item is owned and individually understandable.
- Photography leads without making text-only items unusable.
- Morning Note is specific and evidence-based.
- Explanation follows the PRD’s reasoning order.
- Assumptions are visible only when needed.
- `I wore this` is primary; correction and alternative remain accessible.

### Alternative

- It is materially different and complete.
- The first answer remains recoverable.
- There is no carousel or infinite loop.
- `Change something` is available after the alternative.

### Wear confirmation

- Actual-wear correction and availability choices are explicit.
- No mutation is implied before `Save wear` succeeds.
- Category-aware proposals are editable.
- Saved acknowledgment is quiet, archival, and clear.

### Empty and error states

- The limitation is stated honestly.
- Known context is preserved.
- One useful next step is primary.
- No shopping pressure, blame, generic AI language, or technical leakage appears.

## 22. Brand Alignment Check

### Private style house

The page begins with the customer’s life and owned wardrobe. Technology, integrations, and scoring recede behind a prepared consultation.

### Discernment over abundance

One answer receives the editorial stage. One alternative restores agency without delegating judgment.

### Recognition without surveillance

Specificity appears only where supported. Inference, source, assumption, correction, and learning scope remain legible.

### Romance grounded in reality

Typography, pacing, texture, and the Morning Note create romance. Weather, walking, dress code, availability, laundry, comfort, and accessibility keep it true.

### Stewardship over consumption

Owned garments are the visual protagonists. Empty and incomplete states never become shopping funnels.

### Evolution without erasure

Corrections default to today; longer memory requires affirmative scope. History is acknowledged as an archive, not a performance score.

### Confidence without authority theater

The experience is decisive when evidence is strong and names the specific assumption when it is not. It uses no numeric confidence display or AI spectacle.

### Hospitality in every detail

Loading, permissions, missing context, errors, correction, and deletion receive the same compositional and verbal care as the final look.

### Maximalist with restraint

Richness lives in the personal garment composition, material palette, editorial typography, and lived specificity. Restraint governs the number of actions, density of information, motion, and hierarchy.

## 23. Final Design Standard

Dress My Day succeeds visually when a customer can understand the entire consultation after decoration is removed—and miss its atmosphere when the decoration is gone.

It should not look like the most luxurious wardrobe application. It should feel like a private ritual that happens to be made possible by software: the day understood, the wardrobe considered, and one thoughtful answer waiting.
