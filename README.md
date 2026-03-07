# FinTracker AI – Personal Finance Assistant

An AI-powered personal finance tracker built with HTML, CSS, JavaScript, Node.js, Express, and MongoDB. Users can track expenses, set budgets, visualize spending patterns, and get AI-generated financial insights.

## Features

- User authentication (register/login with JWT sessions)
- Add expenses via natural language (e.g. "spent 200 on lunch today")
- AI auto-categorization of expenses using Hugging Face
- Set monthly budgets with real-time alerts
- Visualize spending trends and budget breakdowns with charts
- AI-generated financial summary and insights
- Budget forecasting with risk assessment
- Per-user data stored in MongoDB
- Responsive design for desktop and mobile

## Tech Stack

- **HTML5 / CSS3 / JavaScript (ES6)** – frontend
- **Chart.js** – visualizations
- **Node.js + Express.js** – backend API
- **MongoDB + Mongoose** – database
- **JWT + bcryptjs** – authentication
- **Hugging Face Inference API** – AI expense classification
- **Google Gemini API** – AI financial summary (streaming)
- **Vercel** – deployment

## Live Demo

https://fin-tracker-beige.vercel.app/

## How to Use

1. Register an account or log in.
2. Set your monthly budget.
3. Add expenses manually or by typing in plain language.
4. Check charts to see trends and category breakdown.
5. Use AI Summary to get personalized financial insights.

## Local Setup

1. Clone the repo and run `npm install`
2. Copy `.env.example` to `.env` and fill in your values
3. Run `node server/index.js`
4. Open `http://localhost:3000`

## Author

**Ekta Singh Yadav**
GitHub: [ektasinghyadav](https://github.com/ektasinghyadav)
