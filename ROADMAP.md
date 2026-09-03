# Curated by Carly Roadmap

## Product Direction

Curated by Carly is becoming an AI-powered luxury wardrobe concierge. The roadmap favors a durable, elegant core before adding intelligence, integrations, or breadth. Each milestone should preserve the editorial experience and meet the technical standards defined in `ARCHITECTURE.md` and `DATABASE_PLAN.md`.

Priorities are organized by horizon rather than calendar date. A milestone advances only when its dependencies are stable and its user value is clear.

## Now

### P0 — Foundation

Establish the shared application shell, visual system, route structure, reusable components, TypeScript standards, and documentation that allow the product to grow without losing coherence.

**Outcome:** a stable, luxury-forward application foundation with clear feature boundaries.

### P0 — Digital Closet

Build the core personal wardrobe experience: typed clothing items, elegant add flow, card-based browsing, empty state, and the beginning of a thoughtful garment model.

**Outcome:** users can begin to see and organize their own collection in a way that feels curated rather than cataloged.

## Next

### P0 — Photos

Introduce private wardrobe photography, image metadata, editorial crops, accessible alternative text, and refined image presentation.

**Outcome:** every piece can be seen as part of a luxury digital wardrobe.

### P0 — Persistence

Implement the Vercel-first data foundation: Vercel Hosting, Vercel-connected Postgres, Auth.js, user-owned records, private Vercel Blob media, and server-side repositories.

**Outcome:** each user has a secure, durable wardrobe that remains available across sessions and devices.

### P1 — Dress My Day

Create the first personalized daily styling experience. Begin with manual occasion and preference inputs plus wardrobe-aware outfit recommendations.

**Outcome:** users receive a calm, relevant answer to “What should I wear today?”

## Later

### P1 — Calendar Integrations

Connect Apple iCloud Calendar, Google Calendar, and Outlook Calendar through explicit, privacy-conscious permissions. Extract only the event context needed for styling.

**Outcome:** Dress My Day understands occasions, timing, and user-approved location context.

### P1 — Weather

Add server-side weather context for the user's selected location, date, and travel plans.

**Outcome:** recommendations reflect practical conditions without making weather data a distracting product surface.

### P1 — Packing

Build destination- and date-aware packing lists from the closet, favorite pieces, planned activities, and weather context.

**Outcome:** users prepare travel wardrobes with less stress and fewer unnecessary items.

### P2 — Lookbooks

Create editorial, saveable outfit collections that let users preserve favorite combinations, references, and seasonal narratives.

**Outcome:** a personal visual archive that makes styling inspiration easy to revisit.

### P2 — Personal Shopper

Introduce intentional shopping guidance: “Should I Buy This?”, duplicate detection, wardrobe gaps, outfit compatibility, and wishlist intelligence.

**Outcome:** users make fewer, better purchases that strengthen the wardrobe they already own.

## Future

### P1 — AI Concierge

Unify wardrobe, favorites, previous outfits, calendar, weather, travel, and personal goals into a secure, transparent concierge experience. The concierge should generate personalized Today’s Edit recommendations and retain only the history required to serve the user well.

**Outcome:** Curated by Carly becomes a trusted daily styling partner, not simply a collection-management tool.

### P2 — Future Mobile App

Extend the most valuable moments to a native mobile experience: quick wardrobe capture, dressing-room use, travel packing, notifications a user explicitly wants, and on-the-go Today’s Edit access.

**Outcome:** the concierge becomes available at the moments a wardrobe decision is actually made.

## Dependency Map

```text
Foundation + Digital Closet
  -> Photos + Persistence
    -> Dress My Day
      -> Calendar Integrations + Weather
        -> Packing + Lookbooks + Personal Shopper
          -> AI Concierge
            -> Future Mobile App
```

## Delivery Principles

- Prioritize a complete, polished core experience over a broad but shallow feature set.
- Keep each milestone modular, independently testable, and safe to evolve.
- Introduce external data only with clear user value, explicit permission, and private-by-default handling.
- Use AI to support discernment and confidence, never to create pressure or unnecessary complexity.
- Preserve the quiet luxury aesthetic at every stage of delivery.

## Confirmed Product Scope

The following requirements were confirmed on July 10, 2026 and should be treated as the durable product backlog.

### Identity and privacy

- The product is shared software with private, user-owned accounts and data.
- Branding is personalized as “Curated / By {first name}.”
- Wardrobe photos, measurements, schedules, outfit history, and styling conversations are private by default.

### Digital Closet and garment intelligence

- Capture a new photo from a phone camera, choose from a phone photo library, browse desktop files, or drag images into the Closet.
- Upload and retain wardrobe photos across devices.
- Automatically suggest garment type, brand, size, and color from an image.
- Keep every suggested field editable and allow optional metadata to remain blank.
- Support a broader garment taxonomy including tops, shirts, sweaters, pants, skirts, dresses, outerwear, shoes, bags, accessories, activewear, and other pieces.

### Personal profile

- Provide a discreet, optional measurements area for height, weight, sizing, and body proportions.
- Use measurements only with the user’s permission and keep explicit profile data separate from AI inferences.

### Today’s Edit

- Show a daily fashion quote and location-aware weather.
- Let the user enter one or more daily events, including time, occasion, location, and notes.
- Recommend an outfit for each entered event using closet, profile, weather, and recent-history context.
- Let the user confirm that a recommended outfit was worn and move it into History.

### Style Archive and History

- Let users upload favorite outfit photos as a personal editorial archive.
- Use confirmed archive entries as transparent signals for personal style and preferences.
- Maintain a dated outfit history with the outfit, occasion, event, and wear status.

### Personal Shopper

- Provide a first-class Personal Shopper destination and image-aware chat interface.
- Accept product photos and links for purchase evaluation.
- Assess compatibility, duplication, wardrobe gaps, and likely usefulness.
- Suggest considered additions and relevant product links without creating sales pressure.

### Experience direction

- The full application should feel warm, polished, timeless, and inviting.
- Use rich restrained colors—especially deep forest greens—refined typography, editorial spacing, and quiet interaction design.
