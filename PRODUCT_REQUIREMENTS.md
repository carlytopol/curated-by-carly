# Product Requirements and Delivery Status

This file is the numbered acceptance ledger for the 13 requirements confirmed on July 10, 2026. A route, placeholder, mockup, or visible control does **not** count as complete. A requirement becomes complete only when its acceptance criteria work with durable user-owned data and have been verified.

Status key:

- **Not started** — no functional implementation exists.
- **UI shell** — a destination or visual placeholder exists, but the requested workflow does not.
- **Partial** — some functional pieces exist, but the complete acceptance criteria are not met.
- **Complete** — implemented and verified end to end.
- **Awaiting integration** — the functional code path exists and passes local build checks, but external credentials, migrations, or deployed verification are still required.

## 1. Multi-device Closet photo intake

**Status: Awaiting application connection verification**

Camera capture, photo-library selection, desktop browsing, drag-and-drop, previews, private upload endpoints, and signed image display are implemented. They require Supabase environment variables, migration application, Storage policies, and mobile integration testing.

Acceptance criteria:

- On a phone, the user can take a new photo with the rear camera.
- On a phone, the user can choose one or more existing images from the photo library.
- On desktop, the user can browse for images or drag and drop them.
- The interface previews files, validates type and size, shows upload progress, and reports errors.
- Images are stored privately and remain attached to the user’s garment across devices and sessions.
- The user can replace, reorder, and remove garment images.

## 2. Automatic and editable clothing category

**Status: Awaiting OpenAI verification**

The expanded editable taxonomy and server-side multimodal analysis endpoint are implemented. Suggestions preserve user-entered values and require an OpenAI key plus private uploaded media for integration testing.

Acceptance criteria:

- Image analysis proposes a clothing type after upload.
- The supported taxonomy includes shirts/tops, sweaters, pants, skirts, dresses, outerwear, shoes, bags, accessories, activewear, and an editable “other” path.
- The proposed category displays its confidence or clearly identifies itself as a suggestion.
- The user can confirm, replace, or clear the suggestion before saving and edit it later.

## 3. Automatic optional brand, size, and color tags

**Status: Awaiting OpenAI verification**

Brand, size, color, item name, category, season, confidence, and alt-text suggestions are implemented, optional, and editable on the garment detail page. OpenAI-backed analysis still requires service activation and verification.

Acceptance criteria:

- Image analysis may suggest brand, dominant color or color family, and visible size information.
- Brand, size, and color are optional and may be blank.
- Suggestions never silently overwrite a user’s values.
- The user can edit or clear every field before saving and from the garment detail view later.
- Low-confidence or unreadable information is left blank rather than invented.

## 4. Luxury boutique experience

**Status: Partial — shared visual system implemented; final cross-device visual QA remains**

The home page and wordmark now use warm ivory, forest green, restrained gold, and editorial spacing. The rest of the application still uses the earlier neutral styling and the typography system is not yet fully refined.

Acceptance criteria:

- Shared tokens govern the complete site’s forest, ivory, charcoal, taupe, and restrained-gold palette.
- A polished editorial display typeface and highly legible interface typeface are used consistently.
- Home, navigation, Closet, Today’s Edit, Profile, History, Style Archive, Packing, and Personal Shopper share one coherent visual system.
- Responsive layouts, loading states, empty states, errors, and motion all preserve the warm, timeless boutique character.
- Accessibility, contrast, keyboard behavior, and reduced-motion preferences are verified.

## 5. Shared product with private personalized accounts

**Status: Awaiting account-flow verification**

Supabase sign-up, confirmation, sign-in, sign-out, cookie refresh, protected-route proxying, server claim verification, and personalized “By {first name}” rendering are implemented. They require the Supabase project configuration and account-isolation testing.

Acceptance criteria:

- A user can create an account, sign in, sign out, recover access, and manage their account.
- Every private query, mutation, image, schedule, measurement, outfit, and conversation is authorized by the authenticated user ID on the server.
- The brand renders “Curated / By Carly” for Carly and “Curated / By {first name}” for another signed-in user.
- A new account starts with private empty data and cannot access another user’s records or media.
- Public marketing/sharing surfaces, if added, are separate from private wardrobe data.

## 6. Daily location-aware weather

**Status: Awaiting integration**

Browser location permission, graceful denial messaging, and a server-side Open-Meteo forecast endpoint are implemented. Live provider and mobile location behavior require integration verification.

Acceptance criteria:

- The app requests location permission with a clear explanation and supports a manually entered fallback location.
- Current-day weather is fetched for the user’s actual or selected location.
- The display includes styling-relevant conditions such as temperature range, precipitation, wind, and material layering needs.
- Weather context is included in recommendations without retaining precise location longer than necessary.
- Permission denial, unavailable location, travel, and provider failure have graceful fallbacks.

## 7. Discreet optional measurements profile

**Status: Awaiting integration**

The optional private profile form, validation, API, and Prisma persistence for measurements, sizes, proportions, fit notes, location, and style notes are implemented. Database-backed verification remains.

Acceptance criteria:

- A private profile section supports optional height, weight, standard sizes, and user-described body proportions or fit preferences.
- Units are selectable and values may be left blank.
- The interface explains how the information improves fit and styling guidance.
- Measurements are encrypted/protected as private user data, editable, exportable, and deletable.
- AI features use the information only with permission and do not expose or infer sensitive judgments.

## 8. Personal Shopper as a primary product pillar

**Status: Awaiting integration**

Personal Shopper is a first-class destination with an implemented wardrobe-aware chat workflow. OpenAI and database activation remain.

Acceptance criteria:

- Personal Shopper remains a first-class home and primary-navigation destination.
- It supports wardrobe-gap questions, collection-building guidance, and “Should I Buy This?” evaluations.
- Recommendations prioritize compatibility, utility, restraint, and the user’s stated goals.

## 9. Image- and link-aware Personal Shopper chat

**Status: Awaiting integration**

The Personal Shopper accepts text, product URLs, and private product images, stores private conversation history, supplies minimized wardrobe/profile context, and supports web-backed product research. It requires OpenAI, Supabase, and end-to-end citation/link QA.

Acceptance criteria:

- The user can send text, one or more product images, and product URLs in a private chat.
- The assistant can compare a candidate with owned wardrobe items, favorite outfits, profile preferences, and recent history.
- The response evaluates duplication, versatility, likely outfits, fit/context concerns, and whether to buy, consider, wait, or pass.
- Suggested purchases may include current product links with clear sourcing and no invented availability or price.
- Conversations and uploaded media follow explicit retention and deletion controls.

## 10. Favorite-outfit Style Archive

**Status: Awaiting integration**

Private outfit-photo capture/upload and dated editorial archive persistence are implemented. Linked closet pieces and explicit preference-signal controls remain follow-up refinements after integration verification.

Acceptance criteria:

- A user can upload one or more photos of themself in a favorite outfit.
- Each entry may include a date, title, occasion, notes, and linked closet pieces.
- The archive is private, browsable, editable, and deletable.
- Only confirmed archive information influences style preferences, and the user can review or disable those signals.

## 11. Dated outfit and occasion History

**Status: Awaiting integration**

Manual dated outfit History and Today’s Edit “I wore this” persistence are implemented. Integration verification and linked garment refinement remain.

Acceptance criteria:

- History records the date, outfit, occasion/event, notes, and linked closet pieces.
- A user can add and edit an entry manually.
- Each Today’s Edit recommendation includes a “Wore this” action that creates a history record for the relevant event.
- Repeated-wear and recent-outfit context can inform later recommendations without discouraging rewearing.

## 12. Daily schedule input in Today’s Edit

**Status: Awaiting integration**

Private multi-event schedule creation, listing, and removal are implemented with time, occasion, location, dress expectations, and notes. Editing/reordering refinement remains after persistence verification.

Acceptance criteria:

- The user can add multiple events for a selected day.
- Each event supports time, title/occasion, location, dress expectations, and optional notes.
- Events can be edited, reordered, and removed.
- Schedule data is private and durable.
- Manual entry works independently of future calendar integrations.

## 13. Complete Today’s Edit experience

**Status: Awaiting integration**

The actual date, rotating attributed quote, live weather, private schedule, wardrobe-aware OpenAI recommendations, alternatives, and “I wore this” History action are implemented. Full service-backed and mobile verification remains.

Acceptance criteria:

- The page displays the actual date and a curated daily fashion quote with attribution.
- It includes the location-aware weather behavior in requirement 6.
- It includes the schedule input in requirement 12.
- It recommends an outfit for every entered event, explaining why it suits the weather, occasion, profile, and wardrobe.
- The user can request an alternative and confirm an outfit as worn.
- Confirming an outfit creates the History entry described in requirement 11.

## Dependency order

```text
Accounts and authorization (5)
  -> Private profile and measurements (7)
  -> Private image storage and Closet uploads (1)
    -> Garment categorization and metadata analysis (2, 3)
    -> Style Archive uploads (10)
  -> Schedule, weather, and outfit/history models (6, 11, 12)
    -> Complete Today's Edit recommendations (13)
  -> Personal Shopper intelligence and chat (8, 9)

Shared luxury design system (4) applies to every stage.
```

## Current delivery focus

The next functional milestone is requirements 5, 7, and 1: authenticated user ownership, the private profile boundary, and durable multi-device wardrobe photo storage. AI classification, weather, history, and chat should not be connected to personal data before that boundary is secure.
