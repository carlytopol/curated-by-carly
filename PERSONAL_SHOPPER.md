# Personal Shopper

## Vision

Personal Shopper is Curated by Carly's considered shopping companion. It helps a user decide what is worth adding to their life—not simply what is available to buy.

It should turn a purchase decision into a quiet, informed styling conversation: Does this piece belong in the wardrobe? What does it replace, complement, or unlock? Will it be worn often enough to deserve a place?

## Philosophy

Personal Shopper should optimize for discernment, not consumption.

- Recommend fewer, better pieces.
- Start with the user's existing wardrobe before looking outward.
- Explain recommendations clearly and without pressure.
- Respect budget, taste, lifestyle, and the pieces a user already loves.
- Treat restraint as a valuable outcome: “Do not buy this” can be the most helpful recommendation.
- Preserve the luxury editorial tone of a trusted stylist, never the urgency of an e-commerce funnel.

## User Journeys

### Considering a specific piece

A user pastes a product link, uploads a future dressing-room image, or enters a short description. Personal Shopper evaluates the piece against their wardrobe, preferences, and current needs, then gives a clear recommendation with rationale.

### Building an intentional wishlist

A user saves pieces they are considering. The product organizes them by need, compatibility, season, and confidence rather than presenting an undifferentiated list of products.

### Preparing for a new chapter

A user says, “I am starting a new job,” “I am traveling to Paris,” or “I want to refine my evening wardrobe.” Personal Shopper identifies the small number of additions that would create the greatest styling value.

### Reviewing before purchase

Before checkout, a user receives a concise assessment: what they already own that serves the same purpose, the outfits this new piece could create, and whether waiting is wiser.

## Should I Buy This?

“Should I Buy This?” is the primary Personal Shopper decision flow.

The assistant should assess:

- Fit with the user's stated style and wardrobe direction.
- Duplicate risk against existing items.
- Number and quality of outfits it can create.
- Relevance to the user's lifestyle, calendar, travel, and climate.
- Cost-per-wear potential, when price and expected use are available.
- Whether the piece fills a real gap or introduces unnecessary complexity.

The response should be direct and nuanced: **Buy**, **Consider**, **Wait**, or **Pass**. It should include a brief explanation, the strongest styling opportunities, and any cautions. A recommendation is guidance, not a claim of certainty.

## Duplicate Detection

Duplicate detection protects the wardrobe from accidental repetition while leaving room for intentional variation.

The system should compare a candidate item with owned items across category, silhouette, color family, material, brand, season, formality, and intended use. It should distinguish between:

- A true duplicate that offers little new value.
- A near duplicate with a meaningful difference, such as a different fabric or occasion.
- A complementary piece that expands outfit options.

The user should see the closest existing pieces and a clear explanation of the overlap. The final decision always remains theirs.

## Wardrobe Gap Analysis

Wardrobe gap analysis identifies what would make the collection more functional, versatile, and aligned with the user's goals.

It should consider category balance, seasonal coverage, color relationships, formality, lifestyle needs, and the ability to complete outfits from existing pieces. Gaps must be framed as optional opportunities, not deficiencies. The product should prioritize foundational, high-utility recommendations over trend-led additions.

## Outfit Compatibility

For each potential purchase, Personal Shopper should identify the owned pieces it works with and the looks it enables. Compatibility should be practical and specific:

- Garments that can be styled together.
- Occasions the combination supports.
- Seasonal and weather relevance.
- Whether it connects isolated pieces in the wardrobe.
- Whether it creates enough new outfits to justify the purchase.

When confidence is low because wardrobe photos or details are incomplete, the system should say so rather than overstate its recommendation.

## Dressing Room Mode

Dressing Room Mode is a future, image-led experience for trying a potential piece in context.

The user may add a product image, a mirror photo, or a future virtual try-on reference. Personal Shopper should place the candidate beside selected wardrobe pieces, suggest complete looks, and highlight the visual and functional role it would play. It should support reflection, not simulate a transactional storefront.

Privacy is essential: personal images should remain private, be processed through authenticated server-side workflows, and follow the media-storage rules in `DATABASE_PLAN.md`.

## Wishlist Intelligence

The wishlist should become more useful over time.

- Group saved pieces by wardrobe need, season, event, or travel plan.
- Surface duplicate and compatibility signals before a user revisits a product.
- Flag when a wishlist piece becomes less relevant because a similar item was acquired.
- Let users set a budget, decision date, or “wait and revisit” reminder.
- Prioritize saved pieces that solve a real wardrobe need over passive browsing.

Wishlist intelligence should be calm and selective. It should never create false urgency or send excessive notifications.

## Long-Term Style Learning

With explicit user permission, the concierge should learn from the user's wardrobe and decisions over time.

Useful signals include favorite pieces, items repeatedly styled together, selected and declined recommendations, worn outfits, travel patterns, stated preferences, and wishlist outcomes. The system should treat these as editable preferences, not an opaque profile.

Users must be able to review, correct, reset, or delete learned style information. The assistant should explain its reasoning in human terms, such as “You tend to favor ivory tailoring and reach for these trousers often.”

## AI Personality

The Personal Shopper should feel like a calm, perceptive, impeccably prepared stylist.

- Warm but concise.
- Assured without being absolute.
- Observant, specific, and respectful of taste.
- Never shaming, overly familiar, or sales-driven.
- Comfortable recommending restraint.
- Editorial in language, practical in advice.

Its tone should evoke a private appointment at an exceptional boutique: attentive, unhurried, and centered on the client.

## Future Roadmap

1. **Foundations** — Wishlist model, item detail inputs, and manual “Should I Buy This?” prompts.
2. **Wardrobe-aware recommendations** — Duplicate detection, outfit compatibility, and gap analysis from user-owned items.
3. **Context-aware guidance** — Calendar, weather, travel, budget, and occasion-aware purchase decisions.
4. **Dressing Room Mode** — Private image comparison, candidate-piece look building, and future try-on support.
5. **Long-term concierge** — Preference learning, proactive but restrained suggestions, and transparent recommendation history.

Personal Shopper succeeds when it helps users buy with more confidence, own with more intention, and want less without feeling deprived.
