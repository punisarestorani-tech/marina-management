# Marina Management System

Sistema za upravljanje marinom sa RBAC (Role-Based Access Control).

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth
- **Maps:** Leaflet.js + react-leaflet
- **State:** Zustand
- **Forms:** React Hook Form + Zod

## Build & Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## Key Directories

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login)
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── map/               # Marina map components
│   ├── forms/             # Form components
│   └── layout/            # Layout components (Sidebar, Header)
├── lib/
│   ├── supabase/          # Supabase client config
│   ├── auth/              # RBAC utilities
│   └── offline/           # Offline sync (TODO)
├── hooks/                 # Custom React hooks
├── stores/                # Zustand stores
└── types/                 # TypeScript types
```

## User Roles

1. **Inspector (Teren)** - Unos zauzetosti, mapa, offline
2. **Operator (Naplata)** - Pretraga, plaćanja, izvještaji
3. **Manager (Ugovori)** - Ugovori, plaćanja, plovila CRUD
4. **Admin** - Korisnici, postavke, audit log

## Database Setup

1. Create a Supabase project at https://supabase.com
2. Run `supabase/migrations/001_initial_schema.sql` in SQL Editor
3. Run `supabase/seed.sql` for demo data
4. Copy `.env.local.example` to `.env.local` and add keys

## Pages

| Route | Role | Description |
|-------|------|-------------|
| `/dashboard` | All | Dashboard sa statistikama |
| `/map` | All | Interaktivna mapa marine |
| `/berths` | All | Lista vezova |
| `/vessels` | Operator+ | Evidencija plovila |
| `/contracts` | Manager+ | Ugovori o zakupu |
| `/payments` | Operator+ | Pregled plaćanja |
| `/violations` | Operator+ | Prekršaji |
| `/reports` | Operator+ | Izvještaji |
| `/admin/users` | Admin | Upravljanje korisnicima |
| `/admin/settings` | Admin | Postavke marine |
| `/admin/audit` | Admin | Audit log |
