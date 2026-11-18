# FinTracker AI

A full-stack personal finance tracker. Type "spent 450 on dinner yesterday" and it fills in the amount, category and date. It forecasts month-end spending against your budget and writes a streamed, plain-language summary of where your money went.

**Live demo:** https://fin-tracker-beige.vercel.app/
&nbsp;·&nbsp; **Demo login:** `demo@fintracker.test` / `demo1234`

## Highlights

- **Natural-language entry.** A sentence becomes a structured expense (amount, description, category, date) through an LLM. If the model is down or rate-limited, a rule-based parser takes over, so adding an expense never fails.
- **Streamed AI summary.** The spending summary arrives token by token over a streaming HTTP response, calls out unusual spending and ends with one concrete tip. Failures show a clear message and a retry button.
- **Budget forecasting.** Projects month-end spend per category and overall, gives a safe daily limit, and labels the risk Low, Medium or High.
- **Secure by default.** Passwords hashed with bcrypt (cost 12), sessions in an httpOnly JWT cookie, and every database query scoped to the logged-in user, taken from the verified session and never from the request body.
- **Tested.** An automated API smoke test (over 45 checks, `npm run smoke`) covering auth, validation, per-user isolation, budgets, filters and the AI paths, plus layout checks in headless Chrome from 320 px to desktop.

## Features

- Register, log in and log out; edit your profile, change your password or delete your account with all its data
- Add, edit and delete expenses; filter by month or date range; clear all
- Monthly budget with alerts as you pass 75% and 90% and when you go over
- Charts for category breakdown and daily spending
- Rule-based insights (week-over-week change, top category, spending spikes) next to the AI summary
- Responsive, keyboard-accessible interface with a visible focus ring, skip link and 44 px tap targets

## Tech stack

| Layer | Choice |
|---|---|
| Front end | HTML5, CSS3, vanilla JavaScript (ES6), Chart.js; one page and one script per feature |
| Back end | Node.js, Express, deployed as a Vercel serverless function |
| Database | MongoDB Atlas with Mongoose (users, expenses, budgets) |
| Auth | JWT in an httpOnly cookie, bcryptjs |
| AI | Vercel AI SDK with Groq (`openai/gpt-oss-120b`) for classification and streaming; keyword-rule fallback |
| Hosting | Vercel, with a preview deployment for every branch |

## Architecture

```
Browser (static pages + page scripts)
   │  fetch, cookie session
   ▼
Express API  ──  auth middleware (verifies JWT, confirms the account still exists)
   ├─ /api/auth      register, login, logout, me, profile, password, account
   ├─ /api/expenses  CRUD, filters, clear all     ┐ every query filtered
   ├─ /api/budget    read, upsert                 ┘ by the session's userId
   ├─ /api/ai        classify a sentence
   └─ /api/stream    streamed spending summary
          │
          ▼
   server/services/ai.js  ← the only file that talks to the LLM
          │  timeouts, error mapping, validation, rule-based fallback
          ▼
        Groq API
```

Design decisions worth noting:

- **One AI boundary.** All model calls live in `server/services/ai.js`. It enforces timeouts, validates the model's output field by field and falls back to rules per field, so a bad answer never reaches the database. The AI only suggests; the user confirms before anything is saved.
- **Streaming that fails cleanly.** The summary route reads the first chunk before sending headers, so a failure becomes a normal JSON error instead of a half-written stream.
- **Per-user data isolation.** `userId` always comes from the verified session. A deleted account's token stops working immediately because the auth middleware checks the user still exists.
- **Indexes.** `Expense.userId` is indexed and `Budget.userId` is unique, giving one budget per user and fast per-user queries.
- **Consistent API.** Proper status codes (400, 401, 404, 409, 500/502) with short readable messages, and the password hash is never returned.

## API

All routes except register, login and logout need a valid session.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account and start a session |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Clear the session cookie |
| GET | `/api/auth/me` | The logged-in user |
| PUT | `/api/auth/profile` | Change name and email |
| PUT | `/api/auth/password` | Change password (needs the current one) |
| DELETE | `/api/auth/account` | Delete the account and all its data |
| GET | `/api/expenses` | List expenses; optional `?month=YYYY-MM` or `?from=&to=` |
| POST | `/api/expenses` | Add an expense |
| PUT | `/api/expenses/:id` | Edit an expense |
| DELETE | `/api/expenses/:id` | Delete one expense |
| DELETE | `/api/expenses` | Delete all of the user's expenses |
| GET | `/api/budget` | Read the monthly budget |
| POST | `/api/budget` | Set or update the budget (upsert) |
| POST | `/api/ai/classify` | Turn a sentence into an expense |
| GET | `/api/stream/summary` | Stream the AI spending summary |

## Run it locally

1. Clone the repo and run `npm install`.
2. Copy `.env.example` to `.env` and fill in:

   | Variable | Purpose |
   |---|---|
   | `MONGODB_URI` | MongoDB Atlas connection string |
   | `JWT_SECRET` | Long random string used to sign sessions |
   | `GROQ_API_KEY` | Free key from console.groq.com. Optional: without it the app still works, using keyword rules and a clear "AI unavailable" message |
   | `GROQ_MODEL` | Optional model override |
   | `PORT` | Optional, defaults to 3000 |

3. `npm start` (or `npm run dev` for auto-restart), then open http://localhost:3000.
4. `npm run seed` adds a demo user (`demo@fintracker.test` / `demo1234`) with about three months of expenses, so the charts and forecast have something to show.

## Testing

```
npm run smoke
```

Runs against a live server (`BASE_URL=https://your-app.vercel.app npm run smoke` for a deployment). It creates two throwaway users, checks authentication, validation, per-user isolation, budgets, filters, performance and the AI paths, then deletes them. Each check prints PASS, FAIL, SKIP (with the reason) or MANUAL.

## Deployment

Deployed on Vercel from GitHub. Set `MONGODB_URI`, `JWT_SECRET`, `GROQ_API_KEY` and `NODE_ENV=production` in the project settings, and allow Vercel in MongoDB Atlas Network Access. `vercel.json` serves the pages and scripts as static files and routes `/api/*` to the Express function.

## Author

**Ekta Singh Yadav**
GitHub: [ektasinghyadav](https://github.com/ektasinghyadav)
