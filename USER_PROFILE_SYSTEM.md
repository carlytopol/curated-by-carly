# User Profile System

## Purpose

The User Profile System is Curated by Carly's long-term foundation for personal relevance. It gives each user a clear, editable expression of their style and enables the concierge to become more helpful over time without turning personal style into a rigid score or an invasive data exercise.

The profile should feel like an evolving private style record: informed by the user, refined through use, and always open to correction. It exists to make recommendations more thoughtful, not to limit what a person can wear, buy, or become.

## Principles

- Begin with a useful experience even when a profile is incomplete.
- Ask for information gradually and only when it improves a specific moment.
- Learn from behavior with humility; observed behavior is a signal, not an unquestionable fact.
- Keep explicit preferences separate from inferred preferences.
- Explain relevant reasoning in clear, human language.
- Give users control to review, edit, reset, export, or delete their profile information.
- Preserve the calm, attentive character of a private luxury styling appointment.

## User Profile

Users may provide the following information over time. None of it should be required at account creation unless it is necessary for a feature the user has explicitly chosen to use.

### Style and aesthetic preferences

| Profile element | What it captures | How it helps |
| --- | --- | --- |
| Preferred style | The words, references, or style directions a user identifies with. | Establishes a starting point for recommendations and language. |
| Favorite designers | Designers, labels, or houses the user returns to. | Helps recognize proportions, materials, and aesthetic affinities. |
| Favorite colors | Colors and neutrals the user enjoys wearing. | Improves outfit suggestions, shopping guidance, and color balance. |
| Colors they avoid | Colors the user rarely wants to wear. | Prevents unhelpful recommendations while allowing intentional exceptions. |
| Preferred silhouettes | Shapes, proportions, fits, and styling tendencies. | Supports garment compatibility and outfit construction. |

Style preferences should accept free-form language as well as future structured options. A user may describe their style as “quiet tailoring,” “soft minimalism,” or “more color than I used to wear”; the profile must preserve that nuance.

### Fit and shopping preferences

| Profile element | What it captures | How it helps |
| --- | --- | --- |
| Size information | Optional category-specific sizes, fit notes, and preferred measurements. | Supports future shopping, dressing-room assistance, and fit-sensitive recommendations. |
| Favorite retailers | Stores or platforms the user trusts and enjoys. | Makes Personal Shopper guidance more practical and relevant. |
| Budget preferences | Optional ranges, investment categories, and spending comfort. | Helps distinguish an aspirational suggestion from an appropriate recommendation. |

Size data is particularly sensitive. It should be optional, editable, and stored only when the user chooses to use a feature that benefits from it. The product should never infer body measurements from photos.

### Lifestyle and context

| Profile element | What it captures | How it helps |
| --- | --- | --- |
| Lifestyle | Typical work, social, caregiving, creative, and activity contexts. | Helps align recommendations to real life rather than abstract style. |
| Climate | Usual home climate and comfort preferences. | Informs seasonal wardrobe balance and practical outfit choices. |
| Travel frequency | Whether and how often the user travels, plus optional travel patterns. | Improves packing guidance and travel-aware recommendations. |

Lifestyle information should be framed as flexible context. A profile might say “mostly client meetings, occasional events” today and change entirely next season.

## AI Learning

The AI should become more useful through behavior over time, without requiring a lengthy manual onboarding process. It should gather only product-relevant signals, assign them confidence rather than certainty, and distinguish a momentary choice from a lasting preference.

### Signals the system may learn from

- Frequently worn pieces and pieces repeatedly selected for recommendations.
- Frequently ignored, dismissed, or replaced recommendations.
- Favorite outfit combinations and garments that consistently appear together.
- Shopping habits, including saved, purchased, declined, and returned wishlist items when the user records them.
- Seasonal preferences, such as colors, layers, silhouettes, and categories chosen at different times of year.
- Explicit corrections, including “I do not wear this anymore,” “show me less of this,” or “this is exactly right.”

### Learning model

Learning should follow a measured progression:

1. **Observe** — Record an event that the user has taken within the product, such as selecting an outfit or favoriting a piece.
2. **Interpret cautiously** — Convert repeated patterns into low-, medium-, or high-confidence signals rather than permanent rules.
3. **Apply selectively** — Use a relevant signal only when it improves the current recommendation.
4. **Explain when useful** — Surface the reason in plain language, for example: “I included these trousers because you have chosen them often for evening plans.”
5. **Invite correction** — Let the user affirm, adjust, or dismiss the inference.

The system must avoid overlearning from a single event. Wearing black for one week does not mean the user has abandoned color; skipping one recommendation does not mean the underlying style is wrong.

## Style Evolution

Personal style changes with season, lifestyle, confidence, travel, work, taste, and time. The profile must recognize this evolution rather than continuously reinforcing an outdated version of the user.

### Time-aware preferences

The system should retain preference history with timestamps and confidence levels. It should weight recent behavior more strongly than distant behavior while preserving long-term patterns that remain useful. Seasonal preferences should be evaluated within their appropriate context rather than averaged into a single year-round profile.

### Recognizing change

Signals of a meaningful style shift may include:

- Repeated selection of new colors, silhouettes, or designers.
- New lifestyle contexts, such as a role change, move, or increased travel.
- Deliberate user statements about a style direction or wardrobe goal.
- A sustained decline in use of formerly favorite pieces.
- Wishlist and purchase decisions that consistently point to a new aesthetic or need.

When a shift becomes credible, the concierge should describe it as an observation, not a conclusion: “You have been reaching for more relaxed tailoring this season. Would you like me to reflect that in future edits?”

### Profile continuity

The system should not erase a user's history simply because their style evolves. Older preferences can remain available as context, tagged by period or season, while current preferences guide active recommendations. Users should be able to view their style evolution as a personal archive, not a permanent label.

## Privacy

All wardrobe data, profile details, photos, shopping considerations, outfit history, and learned preferences remain private to the user. They are never shared with another user, retailer, brand, advertiser, or external service without the user's explicit permission.

The system must follow these commitments:

- Store user-owned profile and wardrobe records in user-scoped, access-controlled data structures.
- Process AI recommendations through authenticated, server-side services.
- Keep provider credentials, calendar tokens, and private media inaccessible to browser code and other users.
- Request clear consent before using external sources such as calendars, weather locations, or retailer integrations.
- Let users review and edit explicit preferences and inferred signals.
- Provide clear controls to disconnect integrations, reset learned preferences, export personal data, and delete their account data.
- Retain only the data required to provide the selected experience, and define deletion and retention behavior before each new data source is introduced.

Privacy should be felt as part of the luxury experience: personal, discreet, and entirely under the user's control.

## Future Personalization

### Dress My Day

The profile will help Dress My Day make recommendations that reflect the user's preferred silhouettes, color direction, comfort needs, lifestyle, climate, calendar context, favorite pieces, and recent outfit history. It should produce a thoughtful suggestion rather than a generic look of the day.

### Personal Shopper

The profile will help Personal Shopper assess whether a candidate item fits the user's established or emerging style, duplicates a current piece, fills a genuine wardrobe gap, works within budget preferences, and creates meaningful outfit compatibility. It should make restraint as easy as purchase.

### Packing

The profile will help Packing balance climate, destination, travel frequency, typical activities, preferred silhouettes, favorite pieces, and personal comfort. It should recommend a wardrobe that feels like the user, even away from home.

### Lookbooks

The profile will help Lookbooks surface personal themes, favorite outfit combinations, seasonal chapters, and evolving aesthetic directions. It should make the archive feel editorial and intimate rather than automated.

### Closet organization

The profile will help the Closet prioritize favorite and frequently worn pieces, reveal practical gaps, suggest meaningful groupings, and create a more useful browsing experience. It should never hide, reorder, or reinterpret a user's collection without making the logic clear and reversible.

## Product and Engineering Boundaries

The User Profile System should be implemented as a dedicated, user-owned domain rather than a collection of opaque AI notes. Future persistence should separate:

- **Explicit profile data** — Information a user enters or confirms.
- **Observed signals** — Timestamped product behavior with a source and confidence level.
- **Inferred preferences** — Explainable conclusions derived from several signals.
- **Recommendation history** — The inputs and outcomes needed to improve future recommendations without storing unnecessary raw context.

No AI feature should require a fully complete profile. Each capability must degrade gracefully, explain uncertainty, and become more helpful only as the user elects to share information and build history.

## Success Criteria

The User Profile System is successful when a user feels understood without feeling watched. Recommendations should become more relevant, more restrained, and more personal over time—while the user can always see, shape, and revoke what the concierge has learned.
