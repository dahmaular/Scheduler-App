# Schedule Planner

A service-time scheduling app for a church service unit. Tracks and plans which member serves at which service each month.

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
├── backend/      # Node.js + Express + MongoDB
└── frontend/     # React + Vite
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally (or provide a MongoDB Atlas URI)

### Backend

```bash
cd backend
cp .env.example .env      # edit MONGO_URI if needed
npm install
npm run dev               # starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # starts on http://localhost:5173
```

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
