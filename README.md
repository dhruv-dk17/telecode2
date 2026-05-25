# NexusAgency — Operating System for Digital Partnerships

NexusAgency is an ultra-premium, cinematic, fullstack collaboration and marketplace platform designed for high-performance agency partnerships. It combines **Fiverr-style secure escrows**, **Slack-grade real-time workspaces**, **Notion-style deliverables tracking**, and **Stripe-grade premium fintech UX**—all optimized for **100% free-tier hosting**.

---

## 🚀 Key Architectural Features
1. **Next.js 15 App Router** (Zero cost hosted on Vercel)
2. **Supabase Serverless Backend** (Free-tier Postgres Database, Secure JWT Auth, S3 Storage, and Realtime WebSockets)
3. **Stripe Connect Escrow System** (Webhook triggers with automated ledger splits)
4. **Cinematic Dark Design System** (Tailwind CSS v4 + Framer Motion + custom glassmorphic aesthetics)
5. **AI Alignment Assistant** (Requirement summaries & scope extraction via Gemini/OpenAI integration)

---

## 🛠️ Getting Started

### 1. Environment Variable Setup
Duplicate `.env.example` to `.env` and insert your credentials:
```bash
cp .env.example .env
```

### 2. Local Installation
Install dependencies:
```bash
npm install
```

### 3. Database Syncing (Prisma)
Prisma is configured out of the box using `prisma.config.ts`. To apply the database schema onto your Supabase PostgreSQL instance:
```bash
npx prisma db push
```

### 4. Running the Project
Launch the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the platform.

---

## 📂 Project Structure
*   `src/app/page.tsx` — Cinematic Awwwards-inspired landing page with smooth physics animations.
*   `src/app/dashboard/page.tsx` — Role-based switcher swappable deck (Hunter, Developer, Client, Admin).
*   `src/app/workspace/[dealId]/page.tsx` — Slack-style chats, Notion milestone boards, S3 file managers, and AI brief summaries.
*   `src/store/useStore.ts` — Zustand reactive store handling multi-role flows, states, and action triggers.
*   `prisma/schema.prisma` — Complete DB relational database modeling.
