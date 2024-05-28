# react-hono

Minimal React + Hono demo for Cloudflare Pages

## Getting Started

1. `pnpm install`
2. `pnpm dev`

## Deploy to Cloudflare Pages

1. `pnpm wrangle`

## Database

The app uses a Neon postgres database with Drizzle ORM.

1. Push schema changes:
`pnpm db:push`
2. Run a local DB client:
`pnpm db:studio`
