# Xhan — Multi-Store Stock Management Platform

## Project Overview

A full-stack multi-store inventory management system built for carpet businesses. Manages stock across multiple stores, tracks products and variants (color × dimension), handles inter-store transfers, and surfaces low-stock alerts.

**No pricing or sales — stock management only.**

**Stack:** NestJS (backend) · React 18 + Ant Design (frontend) · PostgreSQL 15 · Docker
**Status:** ~90% complete — core stock management is production-ready
**Roles:** `MANAGER` (full access) · `STORE_WORKER` (own store only)

---

## Quick Start

```bash
# Option 1: Docker (recommended)
cp .env.example backend/.env   # fill in values
docker-compose up -d

# Option 2: Local dev
cd backend && npm install && npm run start:dev   # Terminal 1
cd frontend && npm install && npm run dev        # Terminal 2
# + PostgreSQL running locally on port 5432

# Seed test data
cd backend && npm run seed
```

**Test credentials:**
| Role | Email | Password |
|------|-------|----------|
| Manager | manager@example.com | Manager123! |
| Worker | worker@example.com | Worker123! |

Frontend: http://localhost:5173 · Backend API: http://localhost:3000/api

---

## Architecture

```
Xhan/
├── backend/          NestJS API (port 3000)
│   └── src/
│       ├── modules/  auth, users, stores, categories, products,
│       │             inventory, reports, uploads
│       ├── database/ TypeORM entities + seed script
│       └── common/   guards (JWT, Roles, StoreAccess), decorators
├── frontend/         React 18 + Vite (port 5173)
│   └── src/
│       ├── pages/    Login, Dashboard, Products, Inventory,
│       │             Reports, Stores, Users, Categories
│       ├── contexts/ AuthContext, StoreContext
│       └── api/      Axios client + auth API
└── docker-compose.yml   PostgreSQL + backend + frontend
```

---

## What Is Complete

### Backend (100% complete)
- [x] JWT auth with refresh tokens (30m access / 7d refresh)
- [x] RBAC guards (JwtAuth, Roles, StoreAccess)
- [x] Users — CRUD, role assignment, store linking
- [x] Stores — CRUD, multi-store architecture
- [x] Categories — hierarchical (parent/child), slug, ordering
- [x] Products — CRUD, SKU, variants (color × dimension), no pricing
- [x] Colors & Dimensions — dynamic creation/reuse
- [x] Inventory — per-store stock, reorder levels, transaction audit trail
- [x] Store Transfers — pending → completed → received, auto inventory adjustment
- [x] Reports — inventory summary (counts, low/out-of-stock), low-stock list
- [x] Docker multi-stage build

### Frontend (90% complete)
- [x] Login page with validation
- [x] Dashboard — products count, inventory records, low-stock alert count
- [x] Products page — list, search, add, variants modal (color + dimension, no prices)
- [x] Inventory page — multi-store stock view, add stock, status indicators
- [x] Reports page — inventory summary card + low-stock item list
- [x] Stores page (manager only) — create, search, deactivate
- [x] Users page (manager only) — create, assign to store, deactivate
- [x] Categories page — create, parent category, delete

---

## What Needs to Be Done

### HIGH PRIORITY

- [ ] **Store Transfers UI** — Backend API is 100% complete. Need a frontend page at `/transfers`:
  - List pending/completed transfers
  - Create transfer modal (from store → to store, select variant + quantity)
  - Manager can approve/complete; receiver can confirm receipt
  - Files to create: `frontend/src/pages/Transfers.tsx`
  - Add route in [App.tsx](frontend/src/App.tsx), add nav link in [Layout.tsx](frontend/src/components/Layout.tsx)

- [ ] **Password Reset Flow** — No way to reset a forgotten password:
  - Backend: add `POST /auth/forgot-password` + `POST /auth/reset-password` endpoints
  - Frontend: add "Forgot password?" link on Login page + reset form
  - Requires SMTP setup (see `.env.example` for mail vars)

### MEDIUM PRIORITY

- [ ] **Product Images** — `ProductImage` entity exists, `UploadsModule` scaffolded, not wired up:
  - Backend: expose upload endpoint in `UploadsController`, link to product
  - Frontend: add image upload/preview in Products page add/edit modal

- [ ] **Inventory Transfer History** — No way to view past transfers in the UI:
  - Add a transfers list/history section (read-only) for workers
  - Managers can see all stores' transfer history

- [ ] **Reports — Store Filter** — API supports `store_id` query param but frontend doesn't expose it:
  - Add store dropdown filter in Reports page (manager only)

- [ ] **Reports — Charts** — Reports page shows cards only, no visualization:
  - Add bar chart for stock levels by category
  - Already have data from `/api/reports/inventory-summary`

### LOW PRIORITY

- [ ] **Low-Stock Notification Banner** — Data exists via `/api/reports/low-stock`:
  - Show persistent warning banner in Layout when items are below reorder level

- [ ] **Export to CSV** — Add export button to Inventory page:
  - Simple client-side CSV generation from current inventory data

- [ ] **Rate Limiting** — No protection against brute-force on auth endpoints:
  - Add `@nestjs/throttler` to `AppModule`
  - Apply to `POST /auth/login` and `POST /auth/refresh`

- [ ] **Automated Tests** — Zero test coverage currently:
  - Unit tests for `InventoryService` (stock adjustments, transfer logic)
  - E2E test for login → adjust stock → verify transaction log

---

## Key Files Reference

| File | Description |
|------|-------------|
| [backend/src/app.module.ts](backend/src/app.module.ts) | Root module, all imports |
| [backend/src/modules/inventory/inventory.service.ts](backend/src/modules/inventory/inventory.service.ts) | Stock tracking, adjustments, transfers |
| [backend/src/modules/reports/reports.service.ts](backend/src/modules/reports/reports.service.ts) | Inventory summary, low-stock report |
| [backend/src/database/seeds/run-seed.ts](backend/src/database/seeds/run-seed.ts) | Test data seeding |
| [frontend/src/App.tsx](frontend/src/App.tsx) | Router & protected routes |
| [frontend/src/components/Layout.tsx](frontend/src/components/Layout.tsx) | Main layout & sidebar nav |
| [frontend/src/contexts/AuthContext.tsx](frontend/src/contexts/AuthContext.tsx) | Auth state, login/logout |
| [frontend/src/contexts/StoreContext.tsx](frontend/src/contexts/StoreContext.tsx) | Store selection (multi-store) |
| [frontend/src/pages/Inventory.tsx](frontend/src/pages/Inventory.tsx) | Stock management (core page) |
| [frontend/src/pages/Products.tsx](frontend/src/pages/Products.tsx) | Products + variant management |

---

## API Endpoints Summary

```
Auth
  POST   /api/auth/login
  POST   /api/auth/refresh
  POST   /api/auth/logout
  GET    /api/auth/me

Users
  GET/POST        /api/users
  GET/PATCH/DEL   /api/users/:id

Stores
  GET/POST        /api/stores
  GET/PATCH/DEL   /api/stores/:id

Categories
  GET/POST        /api/categories
  GET/PATCH/DEL   /api/categories/:id

Products
  GET/POST        /api/products
  GET/PATCH/DEL   /api/products/:id
  GET/POST        /api/products/:id/variants
  DEL             /api/products/:id/variants/:variantId
  GET/POST/DEL    /api/colors
  GET/POST/DEL    /api/dimensions

Inventory
  GET/POST        /api/inventory
  GET/PATCH/DEL   /api/inventory/:id
  POST            /api/inventory/:id/adjust
  GET/POST        /api/inventory/transfers
  GET/PATCH       /api/inventory/transfers/:id

Reports
  GET    /api/reports/inventory-summary?store_id=
  GET    /api/reports/low-stock?store_id=
```

---

## Environment Variables

Copy `.env.example` → `backend/.env` and fill in:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=xhan_db

JWT_SECRET=change_this_to_a_long_random_string
JWT_REFRESH_SECRET=another_long_random_string

PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## Rules

> **PRODUCTION IS LIVE — never touch the production database.**
> All development, testing, seeding, and schema changes must be done against the **dev environment only**.
> If in doubt, check `NODE_ENV` and `DATABASE_URL` / `DB_*` vars before running any command that writes to a database.

---

## Development Notes

- **Adding a new page**: create `frontend/src/pages/NewPage.tsx`, add route in `App.tsx`, add nav item in `Layout.tsx`
- **Adding a new API module**: `nest g module modules/name`, add to `app.module.ts` imports
- **Database changes**: modify entity in `backend/src/database/entities/`, TypeORM `synchronize: true` in dev auto-migrates
- **Role-gated endpoints**: use `@Roles(UserRole.MANAGER)` decorator + `RolesGuard` already applied globally
- **Store-scoped data**: inject `@CurrentUser()` decorator to get user + storeId in controller
- **Re-seed data**: `cd backend && npm run seed` (drops and recreates test data)

---

## Completion Tracker

| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Authentication | ✅ | ✅ | |
| Users | ✅ | ✅ | |
| Stores | ✅ | ✅ | |
| Categories | ✅ | ✅ | |
| Products + Variants | ✅ | ✅ | No prices |
| Inventory | ✅ | ✅ | |
| Store Transfers | ✅ | ❌ | Needs frontend page |
| Reports (stock) | ✅ | ✅ | No monetary values |
| Product Images | ⚠️ | ❌ | Entity exists, not wired |
| Password Reset | ❌ | ❌ | Not started |
| Rate Limiting | ❌ | — | Not started |
| Tests | ❌ | ❌ | Not started |
