# Architecture

## Philosophy

Curated by Carly should be built from small, reusable components. Each component, route, and feature should have a clear purpose and a limited scope.

Every major feature should remain independent enough to evolve without creating unnecessary coupling across the application. The architecture should prioritize clarity over cleverness: a new contributor should be able to understand where code belongs and how data flows without unraveling complex abstractions.

## Folder Structure

The preferred project structure separates routing, shared interface elements, domain logic, and types while preserving the ability to colocate feature-specific code with its route.

```text
app/                 # Routes, layouts, route-specific UI, and route-level loading/error states
components/          # Reusable UI shared across routes and features
lib/                 # Domain logic, data access, validation, and utility functions
types/               # Shared TypeScript domain and API types
hooks/               # Reusable client-side React hooks
styles/              # Shared design tokens, utilities, and non-global style definitions
```

### `app/`

Owns the Next.js route structure. Each route should contain its page, route-specific layout, and private folders such as `_components` or `_lib` for code that is only relevant to that feature. Shared application shell elements belong in root or route-group layouts.

### `components/`

Contains reusable presentation components used in multiple features. Organize shared primitives under `components/ui/`—for example, buttons, inputs, cards, dialogs, and image containers—and broader reusable site elements under a descriptive folder such as `components/site/`.

### `lib/`

Contains framework-light business logic. This includes validation, data mappers, formatting utilities, domain services, and future data-access modules. UI components should call clear library functions rather than embedding complex business rules.

### `types/`

Defines shared TypeScript types for core concepts such as clothing items, outfits, lookbooks, packing lists, and user preferences. Types should describe the domain clearly and avoid `any`.

### `hooks/`

Contains reusable client-side behavior, such as form handling, filtering, selection, and viewport interaction. Hooks should encapsulate behavior, not become a substitute for well-defined data boundaries.

### `styles/`

Holds shared style foundations that do not belong in a single component, including design tokens, typography definitions, and reusable style utilities. Global styles should remain intentionally small; component styling should primarily use the established Tailwind design language.

## Component Principles

- Components should have one responsibility.
- Avoid duplicate code by extracting genuinely reusable patterns.
- Favor composition over large, multipurpose files.
- Keep feature-specific components close to their route; promote them to `components/` only once they are shared.
- Prefer explicit, typed props over hidden assumptions or broad configuration objects.
- Keep presentational components focused on rendering and delegate business rules to `lib/` or feature-level logic.

## State Management

Prefer local React state until shared state becomes necessary. Form state, temporary view state, and interactions confined to one route should remain close to the components that use them.

When state must be shared, first consider URL state, props, or a narrowly scoped context before introducing a global client-side store. When persistence is introduced, UI state and data state must remain separate: UI state describes the current interface, while data state represents the wardrobe and other durable product records.

## Data Layer

The application should be designed so Supabase can be introduced later without large refactors. UI components should not depend directly on a specific database client or query shape.

Define typed domain models in `types/`, place data-access functions behind clear modules in `lib/`, and keep transformation and validation logic independent of the rendering layer. A temporary local data source can implement the same feature-level interface as a future Supabase-backed source, allowing persistence to be added incrementally.

## Future Features

Each product pillar should remain a modular feature with its own routes, feature-specific components, domain logic, and tests. Shared primitives and domain types should be reused deliberately rather than creating dependencies between unrelated screens.

### Digital Closet

Owns garment records, categorization, filtering, and presentation. It should expose well-typed clothing data that other features can consume without taking ownership of closet persistence.

### Today's Edit

Owns the daily styling experience and outfit recommendations. It may consume closet data but should keep recommendation rules and daily UI independent from the closet interface.

### Lookbooks

Owns curated collections of outfits, editorial presentation, and saved style narratives. It should reference outfits and clothing items through shared IDs and types rather than duplicating garment data.

### Packing

Owns trip-based packing lists, planning, and completion state. It should select from the Digital Closet through shared domain models while maintaining its own trip and list logic.

### Shopping

Owns wishlist items, purchase considerations, and wardrobe-gap context. It should remain separate from owned wardrobe inventory while being able to reference shared categories and style preferences.

### AI Stylist

Owns AI-assisted prompts, recommendations, and response presentation. It should receive clean, permissioned inputs through a service boundary and avoid embedding AI-provider details throughout the interface.

### Wardrobe Analytics

Owns derived insights such as category balance, wear patterns, and wardrobe gaps. It should operate on typed, read-only data views and should not become responsible for editing core closet records.

## Engineering Standards

- Write readable code with clear names and direct control flow.
- Keep files small and focused; split code when a file starts serving multiple concerns.
- Use strong TypeScript typing throughout; do not use `any` for domain data.
- Add dependencies only when they provide clear, lasting value.
- Keep server-only and client-only responsibilities explicit.
- Build accessible, responsive interfaces as a default expectation.
- Keep the project scalable, understandable, and maintainable for many years.
