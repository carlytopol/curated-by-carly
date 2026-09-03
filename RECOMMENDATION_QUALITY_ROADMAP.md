# Curated Recommendation Quality Roadmap

**Status:** Governing Product direction; Recommendation Architecture V2 approved with incorporated conditions on July 29, 2026  
**Owner:** Chief Product Officer  
**Date:** July 29, 2026  
**Decision:** Implement through the approved `RECOMMENDATION_ARCHITECTURE_V2.md`; keep Current Preview usable and Production unchanged until explicitly authorized  
**Purpose:** Make Curated reason like an experienced personal stylist rather than an eligibility and scoring system

## 1. Executive decision

The Preview build does not meet Curated’s product promise.

Its recommendations are often structurally complete and technically eligible, yet fundamentally implausible for the customer’s actual life. A doctor’s appointment followed by errands should not naturally resolve to cocktail dresses, evening clutches, or elevated wedges. Warm weather should shape the outfit’s foundation, not appear as a small score adjustment. Unknown pocket data should create uncertainty, not erase the wardrobe.

The remaining failure is philosophical:

> The system asks, “Which eligible combination scores highest?” An experienced stylist asks, “What kind of dressing day is this, what would this person realistically reach for, and what is the least complicated complete look that will make her feel ready?”

The earlier Recommendation Quality Program correctly identified evidence, planning, and whole-look evaluation as technical needs. Those remain useful capabilities, but they are not sufficient organizing principles. They still permit an engine whose core behavior is:

1. enumerate eligible garments;
2. assemble combinations;
3. score them;
4. reject the worst;
5. describe the remainder as styled.

That architecture optimizes possibility, not judgment.

The minimum architectural correction is **three changes**:

1. **Dressing Posture** — decide the human character, effort, and practical posture of the day before considering garments.
2. **Personal Outfit Memory and Composition** — compose from personally plausible foundations and known outfit relationships rather than searching the eligible inventory.
3. **Stylist Adjudication and Consultation** — choose comparatively through editorial judgment, handle uncertainty intelligently, and make correction part of the recommendation contract.

No additional architectural layer is justified before these three are proven. Adding more scores, scenario rules, thresholds, or validators would deepen the current philosophy rather than correct it.

## 2. Why the recommendation philosophy is failing

### 2.1 Eligibility is being mistaken for suitability

An eligible garment is merely not prohibited. It is not necessarily:

- sensible for the ordinary rhythm of the day;
- proportionate to the social stakes;
- worth the effort of wearing;
- coherent with how this customer uses that garment;
- something an experienced stylist would pull first;
- part of an outfit the customer would recognize as herself.

Cocktail dresses may technically satisfy coverage, temperature, and structural requirements. That does not make them plausible for appointments and errands.

### 2.2 Formality is treated as a target rather than a bounded range

The system appears to interpret words such as `polished`, `elevated`, or `considered` as upward pressure. This creates “formality inflation”:

- polished casual becomes casual pieces plus dressier shoes;
- business casual drifts toward occasion dressing;
- ordinary social plans acquire evening accessories;
- “put together” becomes “more formal.”

An experienced stylist uses formality as a floor and ceiling. She understands that:

- polished casual is a coherent genre, not an arithmetic midpoint;
- ordinary life usually rewards ease with intention;
- overdressing can be as wrong as underdressing;
- polish may come from fit, restraint, proportion, condition, and coordination—not added ceremony.

### 2.3 The system begins with garments rather than the life being dressed

Candidate generation begins too soon. The engine has not first decided:

- how much effort this day deserves;
- how physically demanding it is;
- whether the customer will be sitting, changing, waiting, carrying, bending, walking, or being examined;
- whether the day is private, routine, social, visible, ceremonial, or transitional;
- what the customer is likely to tolerate for several hours;
- what would feel overdone even if permitted.

As a result, warm weather, errands, medical appointments, and transitions become factors applied to a garment pool rather than the premise of the outfit.

### 2.4 The system treats the wardrobe as a set of options, not a lived vocabulary

Ownership is not preference. Category is not usage. A dress in the wardrobe may be:

- reserved for dinner;
- associated with a particular season;
- admired but rarely chosen;
- uncomfortable for sitting;
- too precious for errands;
- an event piece rather than a daily option.

The customer’s style exists most clearly in combinations, substitutions, repeated foundations, and occasion-specific habits—not in isolated item affinity.

### 2.5 Whole-look judgment still behaves like score aggregation

The system can recognize roles and constraints, but a technically complete outfit can still pass without answering:

- Does this look make social and emotional sense?
- Is the effort proportional to the day?
- Does one piece distort the meaning of the whole?
- Does the footwear belong with both the foundation and the activity?
- Is the bag necessary and appropriate?
- Would the customer actually choose this over a simpler valid alternative?
- Does the outfit feel intentionally composed, or merely compatible?

These are comparative editorial judgments. They cannot be reduced to incremental score tuning.

### 2.6 Unknown evidence is treated too much like prohibition

Unknown pocket data illustrates the failure. The engine collapses:

- confirmed no pockets;
- unknown pockets;
- probable pockets;
- pockets that require confirmation

into behavior that can remove all recommendations.

An experienced stylist distinguishes consequence:

- if pockets are essential and no bag is allowed, confirm the best likely option;
- if the answer can wait, present a conditional recommendation;
- if several robust options exist, prefer one with confirmed evidence;
- if the uncertainty would make the plan fail, ask one focused question;
- do not treat silence as a negative fact.

### 2.7 Correction is implemented as an interface action rather than part of the service

Broken edit flows in Dress My Day and Profile are not only usability defects. They expose an architectural assumption that recommendation happens first and correction happens afterward.

For Curated, correction is part of the styling consultation:

- “That is too dressy for a doctor’s appointment.”
- “I would never wear those shoes for errands.”
- “This dress is for dinner.”
- “These trousers do have pockets.”

These corrections must immediately reshape the current recommendation and update the appropriate canonical fact or scoped preference with explicit consent. If editability is unreliable, Curated cannot earn personal continuity.

## 3. Missing product principles

The following principles are now required additions to the recommendation constitution.

### 3.1 Plausibility before possibility

Do not ask whether an outfit can be worn. Ask whether this customer would credibly choose it for this exact day.

### 3.2 Ordinary life deserves exact judgment

Errands, appointments, caregiving, commuting, and routine work are not low-information leftovers. They are where Curated must demonstrate the greatest intimacy and restraint.

### 3.3 Effort must be proportional to the day

Every recommendation carries an effort level: dressing effort, walking burden, care burden, carrying burden, social exposure, and adjustment burden. The effort must be justified by the day.

### 3.4 Formality has a ceiling as well as a floor

Overdressing is a recommendation failure. The engine must represent maximum appropriate formality and maximum reasonable ceremony.

### 3.5 Practical context shapes the foundation

Heat, rain, walking, sitting, transitions, appointments, luggage, and carrying requirements determine the kind of outfit to build. They are not finishing adjustments.

### 3.6 Personal style is relational

Style lives in combinations, proportions, repeated foundations, substitutions, and context-specific use. It cannot be modeled adequately by summing item preferences.

### 3.7 Restraint is an active styling choice

Do not add a bag, heel, layer, jewelry, fragrance, or statement piece unless it improves the complete look or solves a real need. “None” is a successful styling decision.

### 3.8 Unknown should soften confidence, not manufacture exclusion

Only confirmed disqualification creates a hard veto. Uncertainty produces preference for robust evidence, a conditional recommendation, one question, or abstention according to consequence.

### 3.9 The simplest excellent outfit should defeat a more elaborate equal

When two looks serve the day equally well, prefer the one with less friction, less carrying, fewer changes, and greater likelihood of actual wear.

### 3.10 Correction is part of hospitality

The customer must be able to redirect the current recommendation without starting again, losing context, or wondering whether Curated remembered the correction.

## 4. Architectural Change 1 — Dressing Posture

### Objective

Create a pre-garment decision layer that determines the human posture of the day: how the customer needs to move, feel, participate, and be perceived—and how much dressing effort is justified.

This replaces “occasion plus requested polish” as the primary starting point.

### Core question

> What kind of dressing experience does this day call for before we look at the wardrobe?

### Inputs

- `DailyAgenda` target and relevant transitions;
- explicit customer notes and current intention;
- Event Policy hard facts;
- weather at meaningful times;
- indoor/outdoor and movement context;
- duration, sitting, standing, walking, carrying, examination, security, and change opportunities;
- explicit comfort/accessibility requirements;
- context-specific Style Profile preferences;
- known personal occasion habits;
- evidence confidence and unknowns.

### Output: Dressing Posture

A versioned `DressingPosture` should contain:

- day character: routine, professional, social, active, travel, ceremonial, intimate, transitional, or mixed;
- social stakes: private, ordinary public, professionally visible, socially visible, ceremonial;
- formality floor and formality ceiling;
- ceremony allowance: none, restrained, expressive, or formal;
- effort budget: low, moderate, or high;
- movement and comfort posture;
- thermal posture;
- weather-protection posture;
- sitting/standing/carrying posture;
- change and adjustment tolerance;
- foundation directions likely to serve the day;
- items or genres likely to feel overdone;
- minimum necessary support roles;
- simplicity preference;
- critical unknowns;
- posture confidence;
- provenance and version.

### Relationship to Event Policy

Event Policy becomes narrower and more authoritative:

- ownership;
- known availability;
- explicit venue rules;
- safety;
- explicit dress-code requirements;
- confirmed activity requirements;
- confirmed user prohibitions.

Event Policy answers:

> What is not permitted or not viable?

Dressing Posture answers:

> Within that safe envelope, what level of ease, polish, effort, and ceremony makes human sense?

Event Policy must stop treating general polish language as a hard upward pressure.

### Required philosophy

- Medical appointments and errands default to ordinary, low-friction dressing unless the customer explicitly asks otherwise.
- Warm weather determines foundation weight, coverage, and footwear posture before candidate selection.
- “Polished” may mean cleaner lines, intentional proportion, and a coherent palette—not heels, clutches, or occasion dresses.
- A cocktail or evening item may be eligible but outside the posture’s ceremony ceiling.
- The posture may explicitly prefer a repeatable everyday foundation over a more novel or elaborate option.

### Acceptance criteria

- Every recommendation request has one traceable Dressing Posture before garment retrieval.
- Routine appointments and errands produce a low-to-moderate effort budget unless explicitly overridden.
- Every posture includes both a formality floor and ceiling.
- Heat, rain, movement, and sitting affect the permitted foundation directions, not only support-piece scoring.
- The same phrase `polished` resolves differently for errands, work, dinner, and a ceremony.
- A garment can be rejected as posture-inappropriate without being globally or event-policy ineligible.
- A neutral/incomplete Style Profile yields a humane context default without pretending to know the customer.
- Product review can understand the intended outfit before seeing any garment IDs.
- No posture rule contains a founder wardrobe item, named scenario, brand, age assumption, or body assumption.

### Measurable quality outcome

- “Wrong level of ceremony” failures fall to zero in the Preview founder scenarios.
- At least 90% of founder-reviewed postures are judged appropriate before garments are introduced.
- Warm-weather scenarios select a warm-weather foundation strategy in 100% of cases where heat is material.
- Routine-day recommendations remain within the approved effort and formality ceiling.

## 5. Architectural Change 2 — Personal Outfit Memory and Composition

### Objective

Replace eligible-inventory optimization with a choice-first composition model that begins from the customer’s personally plausible outfit vocabulary.

The engine should retrieve or construct a small number of likely foundations, then complete them with restraint. It should not enumerate every eligible top/bottom/shoe combination and allow scoring to discover a person afterward.

### Core question

> Given this Dressing Posture, what would this customer most plausibly reach for—and how would her stylist complete it?

### Inputs

- Dressing Posture;
- eligible owned wardrobe after narrow Event Policy vetoes;
- explicit Style Profile;
- confirmed garment roles by occasion;
- confirmed worn outfits;
- repeated foundations and combinations;
- user-created Style Archive looks;
- accepted substitutions and corrections;
- item-specific comfort/fit feedback;
- current availability;
- wear history and repeat tolerance;
- bounded high-confidence inferences;
- garment evidence with uncertainty.

### Output: Personal Outfit Directions

The layer should produce a small portfolio of structured directions:

- foundation or known combination;
- reason it is personally plausible;
- posture alignment;
- required completion roles;
- optional completion roles;
- pieces or genres to avoid for this context;
- personal silhouette/proportion intention;
- effort and adjustment burden;
- evidence provenance;
- uncertainty;
- whether the direction is practical, characteristic, or expressive;
- confidence.

These directions precede final outfit assembly. They are not scores or finished recommendations.

### Composition method

The approved sequence is:

1. Retrieve confirmed or plausible foundations that fit the Dressing Posture.
2. Prefer known successful combinations when still appropriate.
3. Consider personally aligned new combinations when they add real value.
4. Complete the foundation with only necessary support pieces.
5. Prefer the simplest excellent completion.
6. Preserve one materially different challenger when useful.

### Personal Outfit Memory

Curated should remember:

- complete outfits actually worn;
- repeated foundations;
- reliable combinations;
- occasion-specific garment roles;
- substitutions the customer makes;
- pieces consistently removed;
- comfort/fit outcomes;
- explicit “this is for…” reservations;
- customer-confirmed style evolution.

It must distinguish:

- recommended from worn;
- worn from enjoyed;
- owned from chosen;
- saved inspiration from practical preference;
- one-off correction from durable context rule.

### Cold-start behavior

When personal history is sparse:

- use Dressing Posture first;
- use explicit Profile answers where relevant;
- favor restrained, conventional-within-the-customer’s-wardrobe foundations;
- avoid interpreting wardrobe abundance as preference;
- present lower personal confidence honestly;
- ask one question only if it would materially change the direction;
- never compensate for missing personal evidence by maximizing formality or novelty.

### Uncertainty behavior

Unknown item data should influence direction according to consequence:

- prefer confirmed evidence when equally good;
- keep a likely item as conditional when the uncertainty is low consequence;
- ask about a central item when the answer decides viability;
- reject only confirmed incompatibility or unacceptable risk;
- never treat `unknown` as `false`.

For pockets:

- confirmed no pockets fails a genuine no-bag pocket requirement;
- confirmed pockets satisfy it;
- unknown pockets remain a conditional possibility;
- if the best direction depends on them, Curated asks one focused confirmation;
- if another equally good confirmed option exists, prefer it without interrogation.

### Restraint requirements

- Bags are not automatic.
- Fragrance is not an outfit-completeness role.
- Jewelry is not automatic.
- Heels do not manufacture polish.
- Occasion dresses do not manufacture appropriateness.
- Adding more visible luxury cannot compensate for weak day fit.
- A familiar, excellent repeat may defeat novelty.

### Acceptance criteria

- Candidate generation begins from Personal Outfit Directions, not the full Cartesian product of eligible items.
- Every direction states why the customer would plausibly choose it.
- Confirmed outfit combinations and occasion roles are first-class evidence.
- An empty personal history produces restrained context-led behavior, not wardrobe-frequency personalization.
- Support pieces are selected relative to the foundation and posture.
- Optional pieces may be omitted without reducing completeness.
- The same globally eligible item can be plausible for dinner and implausible for errands without becoming globally excluded.
- Current corrections immediately reshape the active direction.
- Unknown pocket data cannot eliminate all directions without a consequence-based decision.
- The model can produce one excellent direction instead of forcing multiple weak options.
- Personal memory remains user-scoped, reviewable, correctable, exportable, and deletable.

### Measurable quality outcome

- At least 90% of surfaced recommendations are judged personally plausible by the founder or evaluation customer.
- Automatic repetition of the same bag, heel, fragrance, or evening category across unrelated contexts falls to zero unless explicitly justified.
- Personally confirmed combinations outrank equally viable generic combinations in at least 90% of applicable evaluation cases.
- Conditional-item handling is judged appropriate in at least 90% of uncertainty scenarios.
- The engine produces fewer candidates while increasing accepted whole-look quality.

## 6. Architectural Change 3 — Stylist Adjudication and Consultation

### Objective

Replace aggregate-score selection as the final authority with comparative editorial adjudication, consequence-aware uncertainty, and a first-class correction loop.

Scores may remain as diagnostics. They must not determine the winner independently.

### Core question

> Of the personally plausible, posture-correct looks, which would an experienced stylist actually recommend—and what would she change before sending the customer out the door?

### Inputs

- Dressing Posture;
- Personal Outfit Directions;
- assembled complete looks;
- Event Policy validation;
- garment and personal evidence;
- practical burden;
- known fit/comfort outcomes;
- current correction state;
- alternative/challenger;
- uncertainty and confidence.

### Adjudication sequence

1. **Reality check** — Does this outfit make sense for the lived day?
2. **Personal plausibility check** — Would this customer credibly choose it?
3. **Effort check** — Is the ceremony, maintenance, and physical burden proportionate?
4. **Whole-look coherence check** — Do foundation, footwear, bag, layer, and accessories tell the same story?
5. **Restraint check** — Can anything be removed or simplified without losing value?
6. **Counterfactual check** — Is there a simpler or more personally characteristic valid alternative?
7. **Uncertainty check** — Is any unknown consequential enough to ask, condition, or abstain?
8. **Editorial decision** — Recommend, revise the composition, ask one question, or abstain.

### Comparative judgment

Adjudication should compare complete looks directly:

- Which is more likely to be worn?
- Which handles the day with less friction?
- Which better expresses the requested feeling without overshooting?
- Which requires fewer unsupported assumptions?
- Which feels more personally continuous?
- Which uses the wardrobe with discernment rather than novelty pressure?

The outcome is a bounded decision record with:

- selected direction and look;
- challenger;
- decisive reasons;
- removed or rejected burden;
- uncertainty treatment;
- confidence;
- provenance;
- explanation-safe facts.

It must not store hidden chain-of-thought.

### Consultation and correction contract

Dress My Day and Profile edits are part of the architecture:

- Edit current plan.
- Correct event, intention, dress code, effort, or comfort.
- Mark an item unavailable.
- Say “too dressy,” “too casual,” “not me,” or “wrong for this kind of day.”
- Replace/remove one piece.
- Correct a garment fact such as pockets.
- Scope the correction to `Today`, `Similar days`, or the item itself.
- Regenerate from the updated posture/direction without losing context.

Every correction must declare:

- immediate effect on the current consultation;
- whether it changes a canonical garment fact;
- whether it creates an explicit context preference;
- whether it is only a one-time instruction;
- what Curated will remember.

Profile editing must follow the same durable explicit-preference contract used by recommendation correction. There cannot be separate meanings of “edit” in Profile and Dress My Day.

### Uncertainty hierarchy

1. Proceed when the preferred look is robust across plausible unknowns.
2. Prefer stronger evidence when quality is otherwise equal.
3. Present a brief conditional note when the unknown is manageable.
4. Ask one focused question when the answer changes the winner or viability.
5. Abstain only when no responsible recommendation can survive the uncertainty.

### Explanation philosophy

The explanation should answer:

- why this level of dressing fits the day;
- why this foundation is personally plausible;
- how weather and movement shaped the choice;
- why the look is simpler or better than the challenger;
- what assumption remains, if any.

It must not merely repeat that the outfit is polished, weather-ready, or appropriate.

### Acceptance criteria

- Aggregate score cannot independently select the primary.
- Every primary is directly compared with at least one plausible challenger when one exists.
- The adjudicator can prefer the simpler look even when the elaborate look has more positive attributes.
- “Too dressy for the day” is a first-class rejection reason.
- Over-formality and excess ceremony are treated as material failures.
- Unknown evidence follows the consequence hierarchy and never defaults to rejection.
- The system may return one recommendation, one question, or an honest abstention.
- Explanations identify actual decisive judgment.
- Dress My Day edits preserve the plan and recommendation context.
- Profile edits update the same explicit preference source consumed by future consultations.
- Customer corrections have immediate, visible effect and do not require re-entering known information.
- No correction silently becomes a permanent preference.
- A failed save never appears remembered.
- Recommendation and Profile editability are included in release acceptance, not treated as separate polish work.

### Measurable quality outcome

- Founder review rates at least 90% of surfaced primaries as “an experienced stylist could credibly recommend this.”
- “Technically valid but fundamentally wrong” output falls to zero in the approved Preview scenarios.
- At least 90% of corrections produce a visibly relevant next recommendation without resetting the consultation.
- Unsupported explanation claims fall to zero.
- Inappropriate abstention and inappropriate confident output both remain below approved calibration thresholds.

## 7. Updated recommendation architecture

```text
DailyAgenda + weather + explicit current intent
                    ↓
              Context Evidence
                    ↓
    Event Policy — narrow hard viability envelope
                    ↓
            Dressing Posture
  day character · effort · formality floor/ceiling
  movement · thermal posture · simplicity · ceremony
                    ↓
 Style Profile + Personal Outfit Memory + garment facts
                    ↓
        Personal Outfit Directions
  plausible foundations · combinations · reservations
                    ↓
        Restrained Outfit Composition
  only necessary shoes · bag · layer · accessories
                    ↓
             Hard Validation
                    ↓
         Stylist Adjudication
  reality · plausibility · effort · cohesion · restraint
  challenger · uncertainty · recommend/ask/abstain
                    ↓
      Explanation + Consultation
                    ↓
 Correction · confirmed wear · scoped learning
```

### Architectural ownership

| Component | Owns | Does not own |
| --- | --- | --- |
| Event Policy | Confirmed hard viability | General taste, desired polish, personal likelihood |
| Dressing Posture | Human day and effort interpretation | Garment selection |
| Style Profile | Explicit and confirmed preferences | Request-specific judgment |
| Personal Outfit Memory | Confirmed combinations and contextual outcomes | Permanent identity conclusions |
| Personal Outfit Directions | Personally plausible strategies | Final adjudication |
| Composition | Complete restrained looks | Final recommendation authority |
| Hard Validation | Non-negotiable factual validity | Relative taste |
| Stylist Adjudication | Comparative editorial choice and uncertainty decision | Durable profile mutation |
| Consultation | Current correction and transparent scope | Silent learning |

## 8. What happens to the prior Recommendation Quality Program

The previous initiatives are not discarded; they are reassigned.

### Previous: Recommendation Evidence Foundation

Becomes supporting infrastructure for all three changes:

- garment evidence supports Dressing Posture and composition;
- personal evidence supports Personal Outfit Memory;
- sufficiency supports adjudication uncertainty.

It is no longer the product philosophy.

### Previous: Contextual Outfit Planning

Is split into:

- Dressing Posture, which determines the human meaning of the day;
- Personal Outfit Directions, which determines personally plausible foundations;
- restrained composition, which completes them.

This prevents a plan from remaining a more elaborate eligibility matrix.

### Previous: Whole-Look Judgment and Calibration

Is replaced as the selection authority by Stylist Adjudication.

Cohesion, polish, and factor scores may remain diagnostic inputs, but:

- no aggregate score chooses the answer;
- no threshold creates taste authority;
- comparative judgment, simplicity, plausibility, and correction govern the product decision.

### Status of `RECOMMENDATION_IMPLEMENTATION_PLAN.md`

The July 28 implementation plan is **paused and superseded for sequencing purposes**. Engineering must not continue its phases until they are remapped to the three architectural changes in this roadmap. Work already completed may be retained only where it supports the new contracts without preserving eligible-inventory optimization as the governing behavior.

## 9. Implementation order

### Phase 1 — Philosophy contracts

Approve and fixture:

- Dressing Posture;
- Personal Outfit Direction;
- Stylist Adjudication Decision;
- correction scope and edit continuity.

No garment-ranking or scoring change should precede these contracts.

### Phase 2 — Posture before garments

Make every request resolve Event Policy and Dressing Posture before candidate retrieval. Validate the posture independently from the wardrobe.

### Phase 3 — Choice-first composition

Replace full-pool candidate enumeration with retrieval of personally plausible foundations and restrained completion.

### Phase 4 — Adjudication and correction

Make comparative editorial judgment the final authority and connect Dress My Day/Profile editing to the same explicit correction contracts.

### Phase 5 — Evaluation and controlled Preview

Evaluate:

- ordinary appointments and errands;
- hot-weather routine days;
- work plus movement;
- social but non-formal plans;
- travel;
- rain;
- small wardrobes;
- unknown critical facts;
- strong personal history;
- no personal history;
- explicit correction and edit continuity.

The Founder scenarios remain evaluation cases, not engine branches.

## 10. Release gates

### Founder validation scenario — school volunteering

The July 29 Preview scenario is release-blocking:

- activity: volunteering at the customer’s child’s school and touring prospective parents through campus;
- explicit intention: polished, comfortable, and conservative;
- practical requirement: flat shoes suitable for walking;
- environmental requirement: warm weather;
- explicit wardrobe instruction: the Roland Garros graphic T-shirt has been taken out of recommendation rotation.

The three surfaced options all fail:

1. The Roland Garros graphic T-shirt is too casual for the requested intention and violates an explicit item-level instruction.
2. A scoop-neck tank top does not satisfy this customer’s stated meaning of conservative for this context.
3. A lace-trim satin skirt introduces evening ceremony and maintenance burden that do not belong to a warm, walking-intensive school day.

The repeated metallic loafers, chain bag, and fragrance also show that support pieces are being appended as a template for “polish,” rather than adjudicated for necessity. Calling each look “approachable polished casual” is not an explanation; it contradicts the evidence.

The approved product interpretation is:

- **Dressing Posture:** ordinary but socially visible school participation; approachable authority; moderate polish; conservative coverage as explicitly defined by this customer; low ceremony; warm-weather ease; walking and standing; low adjustment burden.
- **Personal Outfit Direction:** begin with a breathable, covered, non-evening foundation the customer would plausibly wear for a school-facing daytime role. Do not begin with all eligible tops and bottoms.
- **Stylist Adjudication:** reject any look that is too casual, insufficiently covered, too ceremonial, impractical for sustained walking, or dependent on an explicitly suppressed item. A luxury bag, metallic shoe, or fragrance cannot repair an unsuitable foundation.

“Conservative” must not be inferred from age, body, geography, school, or stereotype. Here it is an explicit customer intention. Curated should apply the customer’s confirmed interpretation—such as shoulder, neckline, hem, opacity, or fit preferences—within the current context. If the interpretation is unclear and would change the recommendation, Curated may ask one focused question.

“Take this item out of rotation” must create a reviewable item-level recommendation state, distinct from deletion or availability. The customer can choose:

- do not recommend until I restore it;
- do not recommend for similar contexts;
- do not recommend today.

The scope must be confirmed, take effect immediately, and be applied before Personal Outfit Direction generation. A suppressed item appearing inside its active scope is a trust-critical failure.

Alternatives remain governed by the same brief as the primary. They may vary silhouette, color, or expression, but may not relax intention, coverage, weather, movement, availability, or suppression requirements. Each must be independently adjudicated. Curated may offer fewer than three options; if none satisfies the brief, it must say so and ask one consequential question rather than knowingly lower the standard.

This scenario passes only when:

- no suppressed item appears in any candidate, primary, alternative, explanation, or cached result;
- every surfaced look independently satisfies the explicit brief;
- insufficiently covered foundations are withheld when they conflict with the customer’s confirmed conservative preference;
- evening or cocktail-coded pieces are withheld unless the Dressing Posture permits that ceremony;
- warm weather and sustained walking visibly shape the foundation and footwear;
- polish comes from line, fit, condition, proportion, and coherence—not automatic accessories;
- alternatives are meaningfully different but equally qualified;
- the explanation identifies the school-facing role, heat, movement, coverage, and restraint that determined the result;
- Curated abstains honestly when the wardrobe cannot support the brief.

### Gate 1 — Posture credibility

- Founder/product review approves the day posture before seeing garments.
- Routine days do not drift into occasion dressing.
- Formality ceilings and effort budgets are enforced.

### Gate 2 — Personal plausibility

- Directions can explain why this customer would choose the foundation.
- Known outfit memory and reservations affect the result.
- Cold start remains restrained and candid.

### Gate 3 — Editorial authority

- Stylist Adjudication, not total score, selects the primary.
- Simpler excellent looks can defeat elaborate alternatives.
- Weak valid looks are revised or rejected.

### Gate 4 — Consultation trust

- Dress My Day editing works end to end.
- Profile editing works end to end.
- Corrections visibly affect the next result.
- Persistence, scope, and failure are clear.

### Gate 5 — Founder Preview approval

- No technically valid but fundamentally implausible recommendation is surfaced in the approved evaluation suite.
- Warm weather, movement, routine context, and uncertainty shape the recommendation at the correct stage.
- Founder explicitly approves recommendation philosophy before broader Preview deployment.

## 11. Product metrics

Do not optimize recommendation volume or acceptance alone.

Measure:

- Dressing Posture approval before garments;
- wrong-ceremony rate;
- over-formality rate;
- personal-plausibility rating;
- actual-wear likelihood rating;
- unnecessary-piece rate;
- practical-foundation compliance;
- conditional-uncertainty appropriateness;
- focused-question value;
- correction relevance;
- edit persistence success;
- challenger win/loss reasons;
- explanation decisiveness and factuality;
- confident-but-wrong rate;
- abstention appropriateness.

The central quality question is:

> Would the customer recognize this as a thoughtful choice for her actual life?

## 12. Brand Bible alignment

### Trust before convenience

Unknowns are acknowledged and corrected rather than converted into false facts or broad exclusions.

### Elegance before complexity

The simplest excellent outfit defeats unnecessary ceremony and decoration.

### Memory before novelty

Known combinations and personal continuity precede inventory exploration.

### Stewardship before consumption

The engine works more intelligently with what is owned; no recommendation failure becomes a shopping prompt.

### Confidence before perfection

Curated gives one credible answer, asks when necessary, and abstains honestly when it cannot serve the day responsibly.

### Private style house

The architecture now centers the relationship an experienced stylist has with a principal:

- understand the day;
- remember how she actually dresses;
- prepare a considered option;
- remove what is unnecessary;
- invite correction;
- remember only with permission.

## 13. Five evaluation questions

### Does this strengthen Dress My Day?

**Yes.** It changes the system from an eligible-outfit generator into a daily styling consultation.

### Does this make the AI meaningfully smarter?

**Yes.** Intelligence moves into day interpretation, personal combination memory, comparative judgment, and uncertainty—not a broader prompt or higher score.

### Does this improve customer trust?

**Yes.** It reduces false certainty, treats correction as first-class, and makes the reasoning proportional to evidence.

### Does this align with the Brand Bible?

**Yes.** It operationalizes restraint, personal continuity, hospitality, reality, and confidence without authority theater.

### Will this architecture still be correct in five years?

**Yes.** Dressing Posture, Personal Outfit Memory, and Stylist Adjudication remain durable as Curated expands into travel, packing, shopping restraint, calendar context, and long-term style evolution.

## 14. Final decision

**Revise.**

Pause further recommendation-engine changes under the July 28 implementation sequence.

Engineering may resume only after the three new contracts—Dressing Posture, Personal Outfit Direction, and Stylist Adjudication/Correction—are approved and the existing work is remapped beneath them.

The minimum number of architectural changes is **three**. Fewer would leave either the day, the person, or the final judgment inside the old eligibility-and-score philosophy. More would add complexity before the core reasoning is correct.
