# How to Run Everything — Step by Step

Follow these steps in order. Use **Command Prompt (cmd)** or **PowerShell** (after fixing execution policy if needed).

---

## Step 1: Install Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org) (LTS)
- **PostgreSQL 15+** — [postgresql.org](https://www.postgresql.org/download/windows/)

Check they’re installed:

```cmd
node -v
npm -v
psql --version
```

---

## Step 2: Create the Database

1. Start PostgreSQL (service running or `pg_ctl start`).
2. Create the database:

**Option A — Command line (if `psql` is in PATH):**

```cmd
psql -U postgres -c "CREATE DATABASE carpet_platform;"
```

**Option B — pgAdmin or another client:**  
Create a new database named `carpet_platform`.

**Option C — Docker (no local Postgres):**

```cmd
cd c:\Users\idris\Desktop\Xhan
docker-compose up -d postgres
```

Wait a few seconds, then the DB is ready. Default: user `postgres`, password `postgres`, database `carpet_platform`.

---

## Step 3: Backend — Install and Run

1. Open a terminal in the project folder.

2. Go to backend and install dependencies:

```cmd
cd c:\Users\idris\Desktop\Xhan\backend
npm install
```

3. Create env file (copy from root):

**Windows (cmd):**

```cmd
copy ..\.env.example .env
```

**PowerShell:**

```powershell
Copy-Item ..\.env.example .env
```

4. (Optional) Edit `backend\.env` if your Postgres user/password/host differ:

```
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=carpet_platform
JWT_SECRET=any-random-string-for-dev
```

5. Start the backend:

```cmd
npm run start:dev
```

Wait until you see something like: **"Application is running on: http://localhost:3000/api"**.

- Backend is at **http://localhost:3000**
- API base is **http://localhost:3000/api**

Leave this terminal open.

---

## Step 4: Seed the Database (Create Login Users)

In a **new** terminal (backend still running in the first):

```cmd
cd c:\Users\idris\Desktop\Xhan\backend
npm run seed:run
```

You should see: **"Seed completed. manager@example.com / Manager123!"**

Logins created:

| Role   | Email                 | Password   |
|--------|-----------------------|------------|
| Manager | manager@example.com  | Manager123! |
| Worker | worker@example.com   | Worker123! |

---

## Step 5: Frontend — Install and Run

In the **same** second terminal (or open a third):

1. Go to frontend and install:

```cmd
cd c:\Users\idris\Desktop\Xhan\frontend
npm install
```

2. Start the frontend:

```cmd
npm run dev
```

Wait until you see something like: **"Local: http://localhost:5173/"**.

- Frontend is at **http://localhost:5173**

Leave this terminal open too.

---

## Step 6: Open the App and Log In

1. In your browser go to: **http://localhost:5173**
2. You should see the **Login** page.
3. Log in with:
   - **Email:** `manager@example.com`
   - **Password:** `Manager123!`
4. After login you’ll see the **Dashboard** (Products, Inventory, Orders, etc.).

---

## Summary — What’s Running

| Thing    | URL                     | Terminal        |
|----------|-------------------------|-----------------|
| Frontend | http://localhost:5173   | `frontend` → `npm run dev` |
| Backend  | http://localhost:3000/api | `backend` → `npm run start:dev` |
| Database | localhost:5432          | PostgreSQL (or Docker)     |

- Use **one terminal** for backend (`npm run start:dev`).
- Use **another terminal** for frontend (`npm run dev`).
- The frontend proxies `/api` to the backend, so the app works from port 5173.

---

## Stopping Everything

1. In the backend terminal: **Ctrl+C**
2. In the frontend terminal: **Ctrl+C**
3. If you used Docker for Postgres: `docker-compose down`

---

## If Something Fails

- **"Cannot connect to database"** — Postgres is not running or `.env` user/password/database name are wrong. Check DB with `psql -U postgres -d carpet_platform -c "SELECT 1;"`.
- **"Port 3000 already in use"** — Another app is using 3000. Change `PORT` in `backend\.env` (e.g. `3001`) and in `frontend\vite.config.ts` proxy target.
- **"Port 5173 already in use"** — Change port in `frontend\vite.config.ts` → `server.port`.
- **npm / PowerShell script errors** — See **Troubleshooting (Windows)** in `README.md` (e.g. use **cmd** or set execution policy).
