# Codex Handoff

## Product intent

Curated by Carly should feel like a private appointment in an exceptional boutique: calm, editorial, useful, and restrained. Its first durable user journey is a personal Digital Closet. That foundation should support private photos and wardrobe-aware daily styling before the product expands into Packing, Lookbooks, Personal Shopper, and a broader AI concierge.

## Imported conversation

The July 10, 2026 ChatGPT conversation documented setup work across GitHub, Vercel, and Supabase. It confirms that:

- A GitHub repository and Vercel project were created.
- A Supabase organization and project were created and its API settings were located.
- Vercel multi-factor authentication and recovery codes were discussed.
- The conversation paused before Supabase environment variables were added and before application code was connected to Supabase.

Do not copy recovery codes, API keys, database credentials, or screenshots containing secrets into this repository.

## Current architecture decision

The product uses Supabase as its managed PostgreSQL provider, cookie-based authentication service, owner-scoped Data API, and private image store. Vercel hosts the Next.js application. Prisma remains available for schema generation and local migration work, but the deployed runtime does not require a direct database credential.

## Completed foundation

- Production deployment: `https://curated-by-carly.vercel.app`
- Supabase authentication with production and local redirect allowlists
- Owner-scoped wardrobe, private media, profile, daily schedule, outfits, recommendations, and history
- Camera/library/drag-and-drop wardrobe uploads with AI Photo Check and AI-assisted editable metadata
- Three-season wardrobe tagging, category filters, and Wardrobe Photo Tips
- Dress my Day automatic local weather, address/venue autocomplete, schedule, recommendations, and worn history
- Packing itinerary-document import and Packing/Personal Shopper conversations grounded in the signed-in user's wardrobe
- Responsive iPhone navigation, form behavior, safe areas, PWA manifest, and circular Curated “C” icon
- Passing lint, TypeScript, nine validation tests, local production build, and Vercel production build

## Known boundaries

- Supabase project `veimbiukubaqiowiankf` is connected locally with its public URL and publishable key.
- All nine application tables were applied to Supabase with Row Level Security enabled on July 11, 2026.
- The private `curated-private-media` bucket was verified with four owner-only policies, a 10 MB limit, and JPEG/PNG/WebP/HEIC/HEIF support.
- Supabase Site URL is the production Vercel address; production and localhost redirect patterns are allowlisted.
- Supabase and OpenAI runtime settings are configured in Vercel Production and Preview environments.
- `CURATED_DEMO_USER_ID` remains only as an unconfigured local-preview bridge.
- The production public shell, sign-in redirect, manifest, iPhone icon, 390 px layout, touch navigation, and horizontal-overflow behavior were verified from this workspace.
- A final signed-in smoke test on a physical iPhone is still recommended for camera permission and Add to Home Screen behavior.

## Recommended execution order

1. Commit and push the current production baseline so GitHub and Vercel can deploy future commits automatically.
2. Sign in on a physical iPhone and verify camera permission, a library upload, AI suggestions, save, and thumbnail display.
3. Add the production site to the iPhone Home Screen and confirm the circular Curated “C” icon.
4. Repeat a short account-isolation test before inviting additional users.

The complete numbered feature ledger and definition of done for every confirmed request lives in `PRODUCT_REQUIREMENTS.md`. A placeholder route or visual prototype must not be described as a completed feature.

## Definition of ready for the next feature

- `npm run check` and `npm run build` pass.
- A fresh environment can be bootstrapped from committed migrations and documented variables.
- The Closet add/list journey works after refresh.
- Deployment access matches the current authentication boundary.
