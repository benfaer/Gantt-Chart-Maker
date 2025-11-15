# Gantt Chart Maker

A modern Gantt chart application built with React, TypeScript, and Supabase. Create beautiful project timelines with tasks, milestones, categories, and hierarchical task structures.

## Features

- **Dashboard**: View and manage all projects
- **Task Management**: Create hierarchical tasks (parent/child) with custom colors
- **Task Intervals**: Add multiple time intervals per task
- **Categories**: Color-coded categories for organizing tasks
- **Milestones**: Track important project milestones
- **Timeline Modes**: Weeks, Months, or Interval Dates view
- **Preview & Export**: Export charts to PDF or image
- **Current Day Indicator**: Visual indicator for today's date

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase (PostgreSQL)
- React Router DOM
- html2canvas + jsPDF

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL script below in your Supabase SQL Editor
3. Get your project URL and anon key from Settings → API

### 3. Configure Environment

Create `.env` in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 4. Start Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Extensions (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- TABLE: projects
-- =========================
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- TABLE: tasks
-- (client generates id via crypto.randomUUID())
-- =========================
CREATE TABLE IF NOT EXISTS public.tasks (
  id            UUID PRIMARY KEY,
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  parent_task_id UUID NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  color         TEXT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- TABLE: categories
-- =========================
CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_project_id ON public.categories(project_id);

-- =========================
-- TABLE: task_intervals
-- =========================
CREATE TABLE IF NOT EXISTS public.task_intervals (
  id          UUID PRIMARY KEY,
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  category_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intervals_task_id ON public.task_intervals(task_id);

-- =========================
-- TABLE: milestones
-- =========================
CREATE TABLE IF NOT EXISTS public.milestones (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id    UUID NULL REFERENCES public.tasks(id) ON DELETE SET NULL,
  date       DATE NOT NULL,
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON public.milestones(project_id);

DROP TRIGGER IF EXISTS trg_milestones_updated_at ON public.milestones;
CREATE TRIGGER trg_milestones_updated_at
BEFORE UPDATE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- RLS (Row Level Security)
-- Open policies for development
-- WARNING: These policies allow public access!
-- For production, implement proper authentication.
-- =========================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Public select projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete projects" ON public.projects FOR DELETE USING (true);

-- Tasks policies
CREATE POLICY "Public select tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Public insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tasks" ON public.tasks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete tasks" ON public.tasks FOR DELETE USING (true);

-- Categories policies
CREATE POLICY "Public select categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete categories" ON public.categories FOR DELETE USING (true);

-- Task intervals policies
CREATE POLICY "Public select intervals" ON public.task_intervals FOR SELECT USING (true);
CREATE POLICY "Public insert intervals" ON public.task_intervals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete intervals" ON public.task_intervals FOR DELETE USING (true);

-- Milestones policies
CREATE POLICY "Public select milestones" ON public.milestones FOR SELECT USING (true);
CREATE POLICY "Public insert milestones" ON public.milestones FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete milestones" ON public.milestones FOR DELETE USING (true);
```

## Security Note

The RLS policies above allow **public access** to all data (no authentication required). This is fine for development, but **NOT suitable for production**.

## Project Structure

```
src/
├── components/
│   ├── gantt/          # Gantt chart components
│   └── ui/             # Reusable UI components
├── pages/              # Main pages (Dashboard, Editor, Preview)
├── integrations/
│   └── supabase/       # Supabase client and types
└── index.css           # Global styles
```

## Usage

1. **Create Project**: Click "Create New Gantt Chart" on dashboard
2. **Add Tasks**: Click "Add Task" to create tasks
3. **Add Subtasks**: Click "Add Subtask" and select a parent task
4. **Add Intervals**: Click on a task → "Add Interval" → set dates
5. **Manage Categories**: Click "Manage Categories" to add/edit colors
6. **Add Milestones**: Click on a task → "Add Milestone"
7. **Preview & Export**: Click "Preview" → "Download as PDF/Image"

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

---
