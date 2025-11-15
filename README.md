# Gantt Chart Maker (Vite + React + TypeScript)

A simple, extensible Gantt chart maker with Supabase backing store. Includes:
- Dashboard with create/delete and preview per project
- Editor for project meta, tasks, categories (color-coded), milestones
- Timeline modes: weeks or exact dates (intervals)
- Preview page with export to PDF or image

## Setup

1) Install dependencies

```bash
pnpm install
# or: npm install
# or: yarn
```

2) Configure environment

Create a `.env` file in the project root with:

```bash
VITE_SUPABASE_PROJECT_ID="bjxzyhwcpszjmctwtcze"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqeHp5aHdjcHN6am1jdHd0Y3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTk4ODEsImV4cCI6MjA3NzczNTg4MX0.rPBthv4DgGblQxzJkf0JLtA9w_D4XD-XS4_-4zgccRE"
VITE_SUPABASE_URL="https://bjxzyhwcpszjmctwtcze.supabase.co"
```

3) Start dev server

```bash
pnpm dev
# or: npm run dev
# or: yarn dev
```

Open http://localhost:5173/

## Notes
- The Supabase tables/types in `src/integrations/supabase/types.ts` mirror your schema and power full typing.
- UI primitives live in `src/components/ui/*` for easy editing.
- Gantt components live in `src/components/gantt/*`.
- Pages are in `src/pages/*`. Routes in `src/App.tsx`.
- Theme toggle uses `localStorage` + `dark` class on `<html>`.

## Extending
- Add fields to Supabase then update the generated types in `types.ts`.
- Style with Tailwind in `src/index.css` and utility classes in components.
- Replace simple modals with a dialog lib if you prefer.
