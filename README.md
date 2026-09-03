# Curated by Carly

Curated by Carly is a private, luxury-forward digital wardrobe and styling experience. It combines a private photographed wardrobe, daily dressing, outfit history, packing guidance, a style archive, and a wardrobe-aware Personal Shopper.

## Current status

- Production: [https://curated-by-carly.vercel.app](https://curated-by-carly.vercel.app)
- Supabase authentication, owner-scoped records, and private photo storage are live.
- My Wardrobe supports camera capture, photo-library selection, desktop drag and drop, AI Photo Check, editable AI garment suggestions, three season tags, category filtering, thumbnails, favorites, and an in-app photo guide.
- Dress my Day supports automatic local weather with saved-location fallback, address autocomplete, a daily schedule, venue autocomplete, wardrobe-aware recommendations, and Wardrobe History.
- Profile, Style Archive, Packing, and Personal Shopper are implemented and user-scoped; Packing accepts itinerary documents as well as typed plans.
- The app includes responsive iPhone navigation, safe-area handling, installable web-app metadata, and a dedicated Curated home-screen icon.

See [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md) for the numbered status and acceptance criteria for all 13 requested capabilities. [PROJECT_PLAN.md](./PROJECT_PLAN.md), [ROADMAP.md](./ROADMAP.md), and [HANDOFF.md](./HANDOFF.md) provide the broader product direction and implementation boundary.

## Local setup

Requirements: Node.js 20+, npm, a Supabase project, and an OpenAI API project for AI features.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and provide:

   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase Auth and Storage configuration.
   - `SUPABASE_PRIVATE_MEDIA_BUCKET`: normally `curated-private-media`.
   - `OPENAI_API_KEY`: server-only key for garment analysis, outfit recommendations, and Personal Shopper.
   - `CURATED_DEMO_USER_ID`: optional local fallback used only while Supabase is unconfigured.
   - `DATABASE_URL`: optional and needed only for local Prisma migration or studio commands.

3. Generate the Prisma client if working on the schema (installation already runs this automatically):

   ```bash
   npm run db:generate
   ```

4. When changing the database schema, set `DATABASE_URL` and apply the committed migrations:

   ```bash
   npm run db:migrate
   ```

5. Start the application:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Verification

Run the local quality checks:

```bash
npm run check
npm run build
```

The validation tests use Node's built-in test runner through the existing `tsx` dependency, keeping the initial test setup intentionally small.

## Data and deployment direction

The active platform is Supabase for PostgreSQL, cookie-based authentication, Row Level Security, and private image storage, with Vercel hosting the Next.js application. Runtime reads and writes use authenticated Supabase APIs, so production does not require a direct database password. Prisma remains available for schema generation and local database maintenance.

The fixed `CURATED_DEMO_USER_ID` is only a local preview bridge. Production routes use Supabase Auth claims and enforce user IDs in every application query and mutation. Do not deploy with the demo ID as the only identity boundary.

## Working with Codex

- Treat the repository documents as the durable source of truth rather than relying on prior chat history.
- Keep changes focused by milestone and commit working checkpoints before beginning the next feature.
- Read the relevant installed Next.js 16 guide under `node_modules/next/dist/docs/` before changing framework APIs or conventions, as required by `AGENTS.md`.
- Never commit `.env.local`, database credentials, recovery codes, or provider secrets.
