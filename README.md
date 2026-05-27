# telecode

Telecode is a premium agency collaboration platform for hunters, developers, clients, and admins. This repo now ships with a production-oriented app skeleton: signed sessions, typed deal state transitions, workspace messaging, AI onboarding summaries, a richer Prisma schema, and API endpoints for health, current user, and deals.

## Current architecture

- `Next.js 16 App Router` frontend and BFF layer
- `TypeScript` across UI, actions, and platform domain services
- `Tailwind CSS v4` and `Framer Motion` for the premium dashboard/workspace shell
- `Prisma + PostgreSQL` schema for the long-term data model
- `Local signed-session mode` for development without external auth
- `Mock-backed platform service` so the app works immediately without a live database

## What was built in this pass

- Signed cookie sessions using HMAC in [src/lib/session.ts](/d:/telecode2/src/lib/session.ts)
- Password hashing with `scrypt` in [src/lib/security.ts](/d:/telecode2/src/lib/security.ts)
- Shared platform domain types in [src/lib/platform/types.ts](/d:/telecode2/src/lib/platform/types.ts)
- Mock runtime datastore and business service layer in [src/lib/platform/mock-data.ts](/d:/telecode2/src/lib/platform/mock-data.ts) and [src/lib/platform/service.ts](/d:/telecode2/src/lib/platform/service.ts)
- Refactored server actions for auth, deals, chat, profiles, and posts
- Rebuilt dashboard, workspace, and feed screens around typed platform data
- Expanded Prisma schema for sessions, payout rules, call sessions, notifications, and dispute lifecycle
- Route handlers:
  - `GET /api/health`
  - `GET /api/me`
  - `GET /api/deals`

## Local setup

1. Copy `.env.example` to `.env`.
2. Set at minimum `SESSION_SECRET`.
3. Install dependencies with `npm install`.
4. Start the app with `npm run dev`.

The current default mode is local signed-session mode. You can log in with the seeded mock identities:

- Hunter: `marcus@telecode.io` / `Telecode123!`
- Developer: `elena@telecode.io` / `Telecode123!`
- Client: `robert@ironpulse.com` / `Telecode123!`

## Database notes

The Prisma schema has been upgraded, but the repo is still safe to run without a migrated database because the application falls back to the in-memory platform store.

When you are ready to move from mock mode to a real database:

1. Set `DATABASE_URL` and `DIRECT_URL`.
2. Run `npx prisma generate`.
3. Run `npx prisma db push` or your preferred migration flow.
4. Replace mock service paths with Prisma-backed implementations incrementally.

## Suggested next steps

1. Add a proper auth provider for Google OAuth and password recovery.
2. Move the mock-backed platform service to real Prisma repositories.
3. Add Stripe Connect payment intents, webhooks, and payout orchestration.
4. Introduce Socket.io and WebRTC services for realtime collaboration and calls.
5. Add admin dispute and analytics surfaces.
