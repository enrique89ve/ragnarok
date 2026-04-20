# Quick Start

Get the Norse Mythos Card Game running in under a minute.

## Prerequisites

- Node.js 18+ 
- npm

## Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open **http://localhost:5000** in your browser.

## What Works Without Database

- Hero selection, deck building, combat, Ragnarok Chess
- All gameplay is client-side

## Optional: Full Features (Pack Opening, Inventory)

1. Copy `.env.example` to `.env`
2. Add your PostgreSQL connection string:
   ```
   DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
   ```
3. Run migrations: `npm run db:push`
4. Restart `npm run dev`

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 5000) |
| `npm run build` | Production build |
| `npm run check` | TypeScript type check |
| `npm run lint` | ESLint |
