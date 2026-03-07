# PROJECT CONTEXT — FinTracker AI Upgrade

You are a senior full-stack engineer and mentor.

I am an MCA 2nd semester student and a complete beginner in advanced backend, AI integration, production architecture etc.

Please explain everything to me in a beginner-friendly way, step-by-step, assuming I am learning these concepts for the first time.

We are NOT starting a new project.

I already have an existing finance tracker project repository and Vercel deployment that you previously helped me build.

We will UPGRADE that existing repository only.

## Project Overview

This project is an upgrade of an existing web application called **FinTracker**, a fully client-side personal expense tracker built with vanilla JavaScript.

The current application is already deployed and functional. It allows users to log expenses, categorize them, and visualize spending patterns using charts.

The goal of this project is **NOT to rebuild the application**, but to **upgrade it into an AI-powered personal finance assistant called FinTracker AI**.

The upgrade must preserve all existing functionality while introducing AI-driven capabilities for expense understanding, financial insights, and predictive analysis.

The system must remain lightweight, developer-friendly, and suitable for deployment on Vercel.

---

# Current Application (Existing Features)

The existing FinTracker application includes:

- Vanilla JavaScript frontend (ES6+)
- HTML5 and CSS3 interface
- Expense logging with predefined categories
- Expense filtering and clearing operations
- Budget tracking and remaining balance calculation
- Dynamic charts using Chart.js:
- Budget Breakdown (doughnut chart)
- Daily Spending Trend (bar chart)
    - Data persistence using the LocalStorage API
    - Fully client-side architecture with no backend

These features must remain intact.

---

# Upgrade Goal — FinTracker AI

The upgraded application should become an **AI-first personal finance assistant** capable of understanding natural language expense entries, generating financial insights, and predicting spending risks.

Unlike the original version, the upgraded system will include:

- AI-powered expense categorization
- Natural language expense logging
- AI-generated financial summaries
- Spending pattern analysis
- Budget forecasting
- Intelligent recommendations

---

# Technology Stack

The upgraded architecture should use the following technologies:

Frontend:

- JavaScript (ES6+)
- HTML5
- CSS3
- Chart.js

Backend:

- Node.js
- Express.js (lightweight API server)

AI Layer:

- Hugging Face Inference API
- Hugging Face embeddings or classification models

Database:

- MongoDB (for storing expenses and historical data)

AI Streaming:

- Vercel AI SDK for streaming responses in the UI

Deployment:

- Vercel (frontend)
- serverless API routes or lightweight backend

Important:

Do NOT use OpenAI API.

Use **Hugging Face free APIs** instead.

---

# Core AI Features to Implement

## 1 Natural Language Expense Logging

Users should be able to type an expense in natural language.

Example inputs:

"I spent 450 on dinner at a restaurant"

"Uber ride cost 120 today"

"Paid 2000 for electricity bill"

The AI should extract structured data:

amount

category

description

date

Example structured output:

{

amount: 450,

category: "Food & Dining",

description: "Dinner at restaurant",

date: "today"

}

---

## 2 AI Expense Categorization

Instead of rule-based mapping, the system should classify expenses using a Hugging Face model.

Possible models include:

- text classification models
- zero-shot classification models

Categories remain:

Food & Dining

Transportation

Shopping

Entertainment

Bills & Utilities

Healthcare

Education

Other

---

## 3 AI Financial Insights

The system should generate monthly summaries such as:

- spending breakdown
- highest spending category
- unusual spikes
- comparison with previous weeks

Example insight:

"You spent 32% more on Food & Dining this week compared to last week."

---

## 4 Budget Forecasting

Using historical expenses, the system should estimate:

- projected end-of-month spending
- overspending risk alerts

Example output:

"At your current rate you may exceed your Food budget by ₹1500 before month-end."

---

## 5 AI Recommendation Engine

The assistant should provide actionable suggestions:

Examples:

- reduce dining expenses
- optimize transport spending
- suggest budget adjustments

These insights should appear inside the dashboard.

---

## 6 Streaming AI Responses

Use **Vercel AI SDK** to stream AI-generated insights into the UI instead of waiting for full responses.

This improves user experience.

---

# Architecture Expectations

The upgraded architecture should include:

Frontend (existing app extended)

Backend API layer

AI service integration

MongoDB database

Suggested structure:

/client

/src

/components

/charts

/ui

/server

/api

/ai

/routes

/services

/database

This structure may be refined during architecture planning.

---

# Upgrade Constraint

IMPORTANT RULE:

Do NOT rebuild the project.

Instead:

- analyze the existing codebase
- extend it gradually
- refactor only when necessary
- preserve working functionality

---

# Development Workflow

Development must follow **structured sprint-based implementation**.

Claude should **not implement everything at once**.

Instead follow the sprints below.

---

# SPRINT PLAN

## Sprint 1 — Codebase Analysis

Analyze the existing FinTracker project.

Explain:

- current architecture
- how expense logging works
- how charts update
- how LocalStorage is used

Identify what needs to change for the AI upgrade.

Do NOT modify code yet.

Wait for approval.

---

## Sprint 2 — Backend Foundation

Create a lightweight Node.js backend.

Add:

Express server

API routes

MongoDB connection

Migrate expense storage from LocalStorage to MongoDB.

Preserve existing UI functionality.

---

## Sprint 3 — AI Service Integration

Integrate Hugging Face APIs.

Implement:

expense text classification

basic NLP parsing for expense entries

Create an AI service layer.

---

## Sprint 4 — Natural Language Expense Logging

Add a new input field allowing natural language expense entry.

Example:

"I spent 500 on groceries"

The backend should parse and structure the expense.

Store results in MongoDB.

---

## Sprint 5 — AI Categorization

Replace rule-based category assignment with AI classification.

Ensure existing charts still update correctly.

---

## Sprint 6 — Financial Insight Generator

Implement AI-generated spending insights.

Create a dashboard panel displaying insights.

---

## Sprint 7 — Budget Forecasting

Analyze historical expenses and estimate future spending.

Generate overspending alerts.

---

## Sprint 8 — Streaming AI Responses

Integrate Vercel AI SDK.

Enable real-time streaming responses for AI insights.

---

## Sprint 9 — UI Improvements

Improve dashboard layout.

Add AI insights panel.

Add loading indicators.

---

## Sprint 10 — Performance & Deployment

Optimize API calls.

Prepare project for Vercel deployment.

Ensure frontend and backend communicate correctly.

---

# Development Rules

Claude must follow these rules:

- Implement features incrementally
- Explain changes briefly after each sprint
- Wait for confirmation before proceeding
- Avoid unnecessary dependencies
- Keep code clean and understandable
- Preserve existing functionality whenever possible

---

# Git and Authorship

Do NOT include any AI attribution.

Do NOT add "Claude Code" or AI credits in the repository.

All commits should appear authored only by the project owner.

---

# First Task

Start with **Sprint 1 — Codebase Analysis**.

Explain the current system and propose the upgrade strategy.

Do NOT begin coding yet.