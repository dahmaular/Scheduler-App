# Daystar Christian Centre — Unit Service Planner

A service-time scheduling app for Daystar Christian Centre's service unit. Tracks and plans which member serves at which service each month.

## Service Types

| Type | Name |
|------|------|
| A | First & Second Service |
| B | Third Service |
| C | Midweek Service |

**Rule:** Every active member must be scheduled **once per service type (A, B, C)** each month.

---

## Project Structure

```
Scheduler-App/
├── backend/      # Node.js + Express + MongoDB Atlas
└── frontend/     # React + Vite
```

---

## Getting Started (Local)

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas URI (or local MongoDB)

### Backend

```bash
cd backend
cp .env.example .env      # fill in MONGO_URI, JWT_SECRET, SEED_KEY, CLIENT_ORIGIN
npm install
npm run dev               # starts on http://localhost:5001
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # starts on http://localhost:5173
```

### Seed the first admin user (run once after backend starts)

```bash
curl -X POST http://localhost:5001/api/auth/seed \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@daystar.org","password":"YourPassword","name":"Admin","seedKey":"your_seed_key"}'
```

---

## Deploying to Vercel

This is a monorepo. Deploy backend and frontend as **two separate Vercel projects**.

### 1 — Deploy the Backend

1. Go to [vercel.com/new](https://vercel.com/new) → Import the `Scheduler-App` repo
2. Set **Root Directory** to `backend`
3. Framework preset: **Other**
4. Add these environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long random secret string |
| `JWT_EXPIRES` | `7d` |
| `SEED_KEY` | A secret key for seeding admin |
| `CLIENT_ORIGIN` | Your frontend Vercel URL (e.g. `https://scheduler-frontend.vercel.app`) |
| `NODE_ENV` | `production` |

5. Deploy → note the backend URL (e.g. `https://scheduler-backend.vercel.app`)

### 2 — Deploy the Frontend

1. Go to [vercel.com/new](https://vercel.com/new) → Import the same repo
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Add this environment variable:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-backend.vercel.app/api` |

5. Deploy

### 3 — Update CORS

After both are deployed, go back to the **backend** Vercel project → Settings → Environment Variables → update `CLIENT_ORIGIN` to your frontend's Vercel URL → Redeploy.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Login, returns JWT |
| POST | `/api/auth/seed` | Public (seed key) | Create initial admin |
| GET | `/api/auth/me` | 🔒 | Current user |
| GET | `/api/members` | 🔒 | List all members |
| POST | `/api/members` | 🔒 | Add a member |
| PUT | `/api/members/:id` | 🔒 | Update a member |
| DELETE | `/api/members/:id` | 🔒 | Delete a member |
| GET | `/api/schedules/names` | 🔒 | List schedule names |
| POST | `/api/schedules/auto-generate` | 🔒 | Auto-assign for a month |
| DELETE | `/api/schedules/name/:name` | 🔒 | Delete a named schedule |



---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/members` | List all members |
| POST | `/api/members` | Add a member |
| PUT | `/api/members/:id` | Update a member |
| DELETE | `/api/members/:id` | Delete a member |
| GET | `/api/schedules?month=YYYY-MM` | Get schedules for a month |
| POST | `/api/schedules` | Add a schedule entry manually |
| DELETE | `/api/schedules/:id` | Remove a schedule entry |
| POST | `/api/schedules/auto-generate` | Auto-assign members for a month |
| GET | `/api/schedules/summary?month=YYYY-MM` | Per-member coverage summary |

---

## Auto-Generate Logic

When you click **Auto-Generate** on the Schedule page:
1. You provide one date per service type (A, B, C).
2. For each type, the system picks the member who has served that type the **fewest times** overall and has **not yet been assigned** that type this month.
3. A unique index on `(member, serviceType, monthKey)` prevents double-booking.
