# AGENTS.md — Becchiamoci

## Project

Italian social event planner ("when should we meet up?"). Users create events, share a link, friends submit availability/activities/places, and the app finds matches.

## Stack

- Next.js 14.2.3 (App Router) — **plain JS/JSX, no TypeScript**
- React 18
- Supabase (client-side, anon key only)
- CSS-in-JS via inline style objects

## Developer Commands

```
npm run dev      # start dev server
npm run build    # production build
npm run start    # start production server
```

No test, lint, or typecheck scripts exist.

## Architecture

- `app/page.js` → renders `<BecchiamoCI />`
- `app/BecchiamoCI.js` → the entire app (single client component, ~1240 lines)
- `app/layout.js` → root layout with metadata
- `lib/supabase.js` → Supabase client, reads from `NEXT_PUBLIC_SUPABASE_*` env vars

## Supabase

- Table used by the Next.js app: **`participants`** (columns: `event_id`, `name`, `color`, `dates`, `activities`, `places`, `id`, `created_at`)
- The `index.html` at root is a **standalone legacy version** that uses different tables (`events`, `responses`) and has hardcoded credentials. Do not modify it unless explicitly asked.
- Event IDs are generated client-side as `{name-slug}-{random}` — there is no `events` table in the Next.js flow.
- The anon key (`sb_publishable_...`) is intentionally public for browser-side use.

## URL Routing

Events are identified via query params: `?event={eventId}&name={eventName}`. No Next.js routes beyond `/`.

## Env

`.env` requires:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
See `.env.example` for template. Values are already set in `.env`.
