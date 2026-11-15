# FinTracker AI – Personal Finance Assistant

An AI-powered personal finance tracker built with HTML, CSS, JavaScript, Node.js, Express and MongoDB. Users can record expenses (by hand or by typing a sentence), set a monthly budget, see charts and a month-end forecast, and read an AI-written summary of their spending.

MCA minor project, Tezpur University. Students: Ekta Singh Yadav, Nirmali Saikia.

## Features

- Register, log in and log out (signed session token in an httpOnly cookie, passwords hashed with bcrypt)
- Add expenses by hand or by typing a sentence such as "spent 200 on lunch yesterday"; the AI fills in the amount, description, category and date
- If the AI is not available, simple keyword rules fill the form instead, so you can always add an expense
- Edit and delete expenses, clear all, filter the history by month or by a date range
- Monthly budget with alerts, a month-end forecast and a risk level (Low, Medium, High)
- Category and daily spending charts for the current month
- AI spending summary that streams in as it is written, points out unusual spending and gives one tip (with a Try again button if it fails)
- Profile page: change name, email and password, or delete the account with all its data
- Separate pages for each feature, responsive on desktop and mobile

## Pages

| Page | File | What it does |
|---|---|---|
| Login / Register | `index.html` | Sign in or create an account |
| Dashboard | `dashboard.html` | Total spent, budget left, alert, forecast, latest expenses |
| Add Expense | `add-expense.html` | One-line AI entry and the manual form |
| History | `history.html` | Filters, edit, delete, clear all |
| Budget | `budget.html` | Set the budget, see the forecast and risk level |
| Analytics | `analytics.html` | Category chart and daily chart |
| AI Insights | `insights.html` | Streamed AI summary and rule-based insights |
| Profile | `profile.html` | Name, email, password, delete account |

Every page except Login checks the session first and goes to the login page if there is none. Shared code is in `app.js`; each page has its own small script in `js/`.

## Tech Stack

- **HTML5 / CSS3 / JavaScript** and **Chart.js** – front end
- **Node.js + Express** – back end API (runs as a Vercel serverless function)
- **MongoDB Atlas + Mongoose** – database (collections: users, expenses, budgets)
- **JWT cookie + bcryptjs (cost 12)** – sessions and passwords
- **Vercel AI SDK** with an OpenAI-compatible LLM provider – AI classification and streamed summary. All AI calls are in `server/services/ai.js`.
- **Vercel** – hosting

## API

All routes except register, login and logout need a valid session. Errors use 400 (invalid input), 401 (not logged in or wrong credentials), 404 (record not found for this user), 409 (duplicate email) and 500/502 (server or AI failure), each with a short `error` message.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account and start a session |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Clear the session cookie |
| GET | `/api/auth/me` | The logged-in user |
| PUT | `/api/auth/profile` | Change name and email |
| PUT | `/api/auth/password` | Change password (needs the current password) |
| DELETE | `/api/auth/account` | Delete the account and all its data (needs the password) |
| GET | `/api/expenses` | List expenses; optional `?month=YYYY-MM` or `?from=...&to=...` |
| POST | `/api/expenses` | Add an expense |
| PUT | `/api/expenses/:id` | Edit an expense |
| DELETE | `/api/expenses/:id` | Delete one expense |
| DELETE | `/api/expenses` | Delete all of the user's expenses |
| GET | `/api/budget` | Read the monthly budget |
| POST | `/api/budget` | Set or update the budget (upsert) |
| POST | `/api/ai/classify` | Turn a sentence into amount, description, category and date |
| GET | `/api/stream/summary` | Stream the AI spending summary |

## Local Setup

1. Clone the repo and run `npm install`
2. Copy `.env.example` to `.env` and fill in your values:

   | Variable | What it is |
   |---|---|
   | `MONGODB_URI` | MongoDB Atlas connection string (add your IP in Atlas, Network Access) |
   | `JWT_SECRET` | Any long random string |
   | `GROQ_API_KEY` | Key for the AI provider (free). Without it the app still works: sentences are read with keyword rules and the AI summary shows a clear "not available" message |
   | `GROQ_MODEL` | Optional: which model to use |
   | `PORT` | Optional, default 3000 |

3. Run `npm start` (or `npm run dev` for auto-restart)
4. Open `http://localhost:3000`

### Demo data

`npm run seed` creates a demo user with about three months of expenses and a budget, so the charts, forecast and insights have something to show:

- Email: `demo@fintracker.test`
- Password: `demo1234`

Running it again resets only that demo user. It never touches anyone else's data.

## Testing

With the server running:

```
npm run smoke
```

`scripts/smoke-test.js` checks every requirement (FR and NFR in the SRS) that can be checked through the API, using two throwaway users that it deletes at the end. It prints PASS, FAIL, SKIP (could not be checked in this run, with the reason) or MANUAL (needs a browser or a person). To test a deployed site: `BASE_URL=https://your-app.vercel.app npm run smoke`. To see the AI-unavailable checks, start the server without `GROQ_API_KEY`.

The charts, forecast, page redirects, mobile layout and the "log an expense in under 30 seconds" check (NFR-4.1) are checked in a browser: log in as the demo user, click through every page, reload each one, and try the phone width (browser developer tools, 320 to 768 px).

## Requirements coverage

| SRS area | Where it is built | How it is checked |
|---|---|---|
| FR-1 Authentication | `server/routes/auth.js`, `server/middleware/auth.js`, `index.html`, login check in `app.js` | smoke test; redirects in the browser |
| FR-2 Expense management | `server/routes/expenses.js`, `server/routes/ai.js`, `js/add-expense.js`, `js/history.js` | smoke test |
| FR-3 History and filtering | `GET /api/expenses` filters, `js/history.js` | smoke test |
| FR-4 Budget and forecast | `server/routes/expenses.js` (budget), `forecastBudget()` in `app.js` | smoke test (budget); forecast in the browser |
| FR-5 AI insights | `server/routes/stream.js`, `server/services/ai.js`, `js/insights.js` | smoke test (needs the AI key) |
| FR-6 Analytics | `js/analytics.js` | browser |
| FR-7 Profile and account | `server/routes/auth.js`, `profile.html`, `js/profile.js` | smoke test |
| NFR-1 Performance | indexed per-user queries, parallel reads | smoke test (list and budget under 2 s), browser (charts) |
| NFR-2, NFR-7 Reliability and safety | AI errors become clear messages, AI never writes data | smoke test (run once without the AI key) |
| NFR-3, NFR-8 Security and data | bcrypt, httpOnly cookie, `userId` always from the session | smoke test |
| NFR-4 Usability | inline hints, pre-filled date and category, responsive CSS | browser |
| NFR-5 Maintainability | one page and one script per feature, one route file per area | smoke test, code layout |
| NFR-6 Scalability | free-text categories, indexed `userId`, one budget per user | smoke test |

## Deployment

The app is deployed on Vercel from GitHub; every branch gets its own preview link. In the Vercel project add `MONGODB_URI`, `JWT_SECRET`, `GROQ_API_KEY` and `NODE_ENV=production`. In MongoDB Atlas, Network Access must allow Vercel (Vercel's addresses change, so `0.0.0.0/0` is the usual choice for a student project). `vercel.json` serves the pages and `js/` files as static files and sends `/api/*` to the Express function.

## Live Demo

https://fin-tracker-beige.vercel.app/

## Author

**Ekta Singh Yadav**
GitHub: [ektasinghyadav](https://github.com/ektasinghyadav)
