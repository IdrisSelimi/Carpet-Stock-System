# Carpet E-Commerce Platform

Multi-store carpet retail management system with role-based access (Managers vs Store Workers), real-time inventory, products with variants (colors/dimensions), orders, and reports.

## Architecture

- **Backend**: NestJS (Node.js), TypeORM, PostgreSQL, JWT auth, RBAC
- **Frontend**: React 18, Vite, TypeScript, Ant Design, TanStack Query
- **Database**: PostgreSQL 15+ with full schema (users, stores, categories, products, variants, inventory, orders, transfers)

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### 1. Database

Create a database and run migrations (or use synchronize in dev):

```bash
createdb carpet_platform
```

### 2. Backend

```bash
cd backend
npm install
cp ../.env.example .env   # edit if needed
npm run start:dev
```

Backend runs at http://localhost:3000/api

### 3. Seed (optional)

Creates manager and store worker users plus sample data:

```bash
cd backend
npm run seed:run
# Login: manager@example.com / Manager123!
# Worker: worker@example.com / Worker123!
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173 (proxies /api to backend).

### 5. Docker (optional)

```bash
docker-compose up -d postgres   # DB only
# or
docker-compose up -d            # DB + backend + frontend
```

## API Overview

| Area        | Endpoints |
|------------|-----------|
| Auth       | POST /api/auth/login, /refresh, GET /api/auth/me |
| Users      | GET/POST/PUT/DELETE /api/users |
| Stores     | GET/POST/PUT/DELETE /api/stores |
| Categories | GET/POST/PUT/DELETE /api/categories |
| Products   | GET/POST/PUT/DELETE /api/products, /api/products/:id/variants, /api/colors, /api/dimensions |
| Inventory  | GET/PUT /api/inventory, /api/inventory/transfers |
| Orders     | GET/POST/PUT/DELETE /api/orders |
| Reports    | GET /api/reports/sales, /api/reports/inventory-value, /api/reports/low-stock |

## Roles

- **MANAGER**: Full access to all stores, users, categories, products, reports.
- **STORE_WORKER**: Limited to assigned store (inventory, orders, store-scoped reports).

## Project Structure

```
├── backend/          # NestJS API
│   ├── src/
│   │   ├── common/    # Guards, decorators
│   │   ├── config/
│   │   ├── database/  # Entities, seeds
│   │   └── modules/  # Auth, Users, Stores, Categories, Products, Inventory, Orders, Reports, Uploads
│   └── package.json
├── frontend/         # React + Vite
│   ├── src/
│   │   ├── api/      # API client
│   │   ├── components/
│   │   ├── contexts/
│   │   └── pages/
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Docs

Reference docs (from your architecture) are in the repo root or `/docs` if you copy them:

- `carpet-platform-architecture.md` – Full architecture
- `database-erd.mermaid` – ERD
- `implementation-checklist.md` – Implementation checklist
- `api-implementation-guide.md` – API examples

## Troubleshooting (Windows)

**"Running scripts is disabled" when running `npm install` in PowerShell**

PowerShell’s execution policy is blocking scripts (including `npm.ps1`). Fix it in one of these ways:

1. **Allow scripts for your user** (recommended): In PowerShell, run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
   Then run `npm install` again.

2. **Use Command Prompt instead**: Open `cmd` (Win+R → type `cmd` → Enter), then:
   ```cmd
   cd c:\Users\idris\Desktop\Xhan\backend
   npm install
   ```

## License

Private / internal use.
