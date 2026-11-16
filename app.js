// Shared code used by every page after login: toast messages, the API helper,
// the login check, the header with the menu, and this month's data.
// Each page has its own small script in the js/ folder.

// Show a toast notification (replaces alert())
// type: 'default' | 'success' | 'error' | 'warning'
function showToast(message, type = 'default') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type !== 'default' ? type : ''}`.trim();
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Make user text safe before putting it into HTML.
// Without this, a description like <img onerror=...> would run as code.
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Currently logged-in user ({ name, email })
let currentUser = null;

// This month's expenses and the monthly budget (filled by loadMonthData)
let expenses = [];
let budget = 0;

// Base URL for our Express API
// Using a relative path so it works both locally and on Vercel
const API_URL = '/api';

// Colors for different categories (used in charts)
const categoryColors = {
    'Food & Dining': '#E07A5F',
    'Transportation': '#F4A261',
    'Shopping': '#E9C46A',
    'Entertainment': '#2A9D8F',
    'Bills & Utilities': '#264653',
    'Healthcare': '#E76F51',
    'Education': '#457B9D',
    'Other': '#A8DADC'
};


// Calls our API and returns the JSON reply.
// If the server answers with an error, this throws an Error with the server's message,
// so the caller can show it instead of pretending everything worked.
async function api(url, options = {}) {
    let res;
    try {
        res = await fetch(url, {
            method: options.method || 'GET',
            headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
    } catch (err) {
        throw new Error('Could not reach the server. Is it running?');
    }

    let data = null;
    try {
        data = await res.json();
    } catch (err) {
        // the reply had no JSON body — that is fine
    }

    if (!res.ok) {
        throw new Error((data && data.error) || 'Something went wrong. Please try again.');
    }
    return data;
}

// Date as "YYYY-MM-DD" using the user's local date (not UTC)
function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// The current month as "YYYY-MM"
function currentMonth() {
    return localDateString(new Date()).slice(0, 7);
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    }
}

// ─── LOGIN CHECK AND HEADER ───────────────────────────────────────────────────

// Asks the server who is logged in (GET /api/auth/me).
// If nobody is, go to the login page and return false (FR-1.6).
async function requireLogin() {
    let res;
    try {
        res = await fetch('/api/auth/me');
    } catch (err) {
        throw new Error('Could not reach the server. Is it running?');
    }

    if (res.status === 401) {
        window.location.replace('index.html');
        return false;
    }
    if (!res.ok) {
        throw new Error('Could not check your login. Please try again.');
    }

    currentUser = await res.json();
    return true;
}

// The menu shown at the top of every page
const NAV_LINKS = [
    { page: 'dashboard',   label: 'Dashboard',   href: 'dashboard.html' },
    { page: 'add-expense', label: 'Add Expense', href: 'add-expense.html' },
    { page: 'history',     label: 'History',     href: 'history.html' },
    { page: 'budget',      label: 'Budget',      href: 'budget.html' },
    { page: 'analytics',   label: 'Analytics',   href: 'analytics.html' },
    { page: 'insights',    label: 'AI Insights', href: 'insights.html' },
    { page: 'profile',     label: 'Profile',     href: 'profile.html' }
];

// Fills <header id="appHeader"> with the logo, menu, user name and Logout button.
// statsHtml is optional: only the dashboard shows the stat cards in the header.
function renderHeader(activePage, statsHtml) {
    const links = NAV_LINKS.map(link => `
        <a class="nav-link" href="${link.href}" ${link.page === activePage ? 'aria-current="page"' : ''}>${link.label}</a>
    `).join('');

    const header = document.getElementById('appHeader');
    header.className = 'header';
    header.innerHTML = `
        <a class="skip-link" href="#main">Skip to content</a>
        <h1 class="logo">FinTracker <span class="logo-ai">AI</span></h1>
        <nav class="main-nav" aria-label="Main">${links}</nav>
        <div class="header-user">
            <span id="userName" class="user-name"></span>
            <button id="logoutBtn" class="btn-logout">Log out</button>
        </div>
    `;

    // Stat cards sit under the bar, not inside it
    document.querySelectorAll('.header-stats').forEach(el => el.remove());
    if (statsHtml) header.insertAdjacentHTML('afterend', `<div class="header-stats">${statsHtml}</div>`);

    // textContent (not innerHTML) so the name is always shown as plain text
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('logoutBtn').onclick = handleLogout;

    // The skip link jumps to the first section of the page
    const firstSection = document.querySelector('.container > section');
    if (firstSection) { firstSection.id = 'main'; firstSection.tabIndex = -1; }
}

// Log out on the server, then go back to the login page
async function handleLogout() {
    try {
        await api(`${API_URL}/auth/logout`, { method: 'POST' });
        window.location.replace('index.html');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Every page calls this once: check login, draw the header, run the page's own
// setup (initPage), then hide the loading screen.
async function startPage(activePage, initPage, statsHtml) {
    try {
        if (!(await requireLogin())) return; // going to the login page, keep the loading screen
        renderHeader(activePage, statsHtml);
        await initPage();
    } catch (err) {
        console.error('Page failed to load:', err);
        showToast(err.message, 'error');
    }
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// The Back button can show a saved copy of a page after logout. Reload it so
// the login check runs again.
window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
});

// ─── DATA, TOTALS AND FORECAST ────────────────────────────────────────────────

// Load this month's expenses and the budget from the server
async function loadMonthData() {
    // Fetch both at the same time (parallel requests)
    const [monthExpenses, budgetData] = await Promise.all([
        api(`${API_URL}/expenses?month=${currentMonth()}`),
        api(`${API_URL}/budget`)
    ]);

    expenses = monthExpenses;
    budget = budgetData.amount;
}

// HTML for one expense row. withActions adds the edit and delete buttons.
function expenseRowHTML(expense, withActions) {
    const color = categoryColors[expense.category] || '#A8DADC';
    const actions = withActions ? `
            <div class="expense-actions">
                <button class="btn-icon btn-edit" onclick="openEditModal('${expense._id}')" title="Edit" aria-label="Edit ${escapeHtml(expense.name)}">✏️</button>
                <button class="btn-icon btn-delete" onclick="deleteExpense('${expense._id}')" title="Delete" aria-label="Delete ${escapeHtml(expense.name)}">🗑️</button>
            </div>` : '';

    return `
        <div class="expense-item ${withActions ? '' : 'no-actions'}">
            <div class="expense-info">
                <h4>${escapeHtml(expense.name)}</h4>
                <div class="expense-meta">
                    <span class="expense-category"><span class="category-dot" style="background: ${color}"></span>${escapeHtml(expense.category)}</span>
                    <span>${formatDate(expense.date)}</span>
                </div>
            </div>
            <div class="expense-amount">${formatMoney(expense.amount, 2)}</div>
            ${actions}
        </div>`;
}

// Money text used everywhere, e.g. formatMoney(19570, 2) -> "₹19,570.00" (Indian digit grouping)
function formatMoney(amount, decimals = 0) {
    const sign = amount < 0 ? '-' : '';
    return sign + '₹' + Math.abs(Number(amount)).toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Update the stat cards (dashboard)
function updateStats() {
    const totalSpentEl = document.getElementById('totalSpent');
    const budgetRemainingEl = document.getElementById('budgetRemaining');
    if (!totalSpentEl || !budgetRemainingEl) return; // this page has no stat cards

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = budget - total;

    totalSpentEl.textContent = formatMoney(total, 2);
    budgetRemainingEl.textContent = formatMoney(remaining, 2);

    // Colour the remaining amount: over budget, low (under 20% left) or fine
    budgetRemainingEl.classList.remove('is-ok', 'is-low', 'is-over');
    if (remaining < 0) {
        budgetRemainingEl.classList.add('is-over');
    } else if (remaining < budget * 0.2) {
        budgetRemainingEl.classList.add('is-low');
    } else {
        budgetRemainingEl.classList.add('is-ok');
    }
}

// Check budget and show alerts
function checkBudget() {
    const budgetAlert = document.getElementById('budgetAlert');
    if (!budgetAlert) return; // this page has no budget alert

    if (budget === 0) {
        budgetAlert.classList.add('hidden');
        return;
    }

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = budget - total;
    const percentUsed = (total / budget) * 100;

    budgetAlert.classList.remove('hidden', 'success', 'warning', 'danger');

    // Show different alerts based on budget usage
    if (remaining < 0) {
        budgetAlert.classList.add('danger');
        budgetAlert.textContent = `⚠️ You've exceeded your budget by ${formatMoney(Math.abs(remaining), 2)}!`;
    } else if (percentUsed >= 90) {
        budgetAlert.classList.add('warning');
        budgetAlert.textContent = `⚠️ Warning: You've used ${percentUsed.toFixed(0)}% of your budget!`;
    } else if (percentUsed >= 75) {
        budgetAlert.classList.add('warning');
        budgetAlert.textContent = `You've used ${percentUsed.toFixed(0)}% of your budget. Spend wisely!`;
    } else {
        budgetAlert.classList.add('success');
        budgetAlert.textContent = `✓ You're on track! ${percentUsed.toFixed(0)}% of budget used.`;
    }
}

// Forecast end-of-month spending and per-category projections
function forecastBudget() {
    const panel = document.getElementById('forecastPanel');
    const riskBadge = document.getElementById('riskBadge');
    if (!panel) return;

    if (expenses.length === 0 || budget === 0) {
        panel.innerHTML = '<p class="insights-empty">Set a budget and add some expenses to see your forecast.</p>';
        if (riskBadge) riskBadge.classList.add('hidden');
        return;
    }

    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;

    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const dailyAvg = total / dayOfMonth;
    const projected = dailyAvg * daysInMonth;
    const projectedOverspend = projected - budget;
    const budgetRemaining = budget - total;
    const safeDailyLimit = daysRemaining > 0 ? budgetRemaining / daysRemaining : 0;

    // How many days until the budget runs out at current rate
    const daysUntilEmpty = dailyAvg > 0 ? Math.floor(budgetRemaining / dailyAvg) : Infinity;
    const daysUntilEmptyText = daysUntilEmpty <= 0
        ? 'Exhausted'
        : daysUntilEmpty === Infinity
            ? '—'
            : `${daysUntilEmpty}d`;

    // ── Risk level ───────────────────────────────────────────────────────────
    let risk, riskClass;
    if (projected <= budget) {
        risk = 'Low Risk';
        riskClass = 'risk-low';
    } else if (projectedOverspend <= budget * 0.15) {
        risk = 'Medium Risk';
        riskClass = 'risk-medium';
    } else {
        risk = 'High Risk';
        riskClass = 'risk-high';
    }

    if (riskBadge) {
        riskBadge.textContent = risk;
        riskBadge.className = `risk-badge ${riskClass}`;
    }

    // ── Per-category projections ─────────────────────────────────────────────
    const byCategory = {};
    expenses.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    const categoryProjections = Object.entries(byCategory).map(([category, spent]) => {
        const catProjected = (spent / dayOfMonth) * daysInMonth;
        return { category, spent, projected: catProjected };
    }).sort((a, b) => b.projected - a.projected);

    // Scale bars relative to the highest projected value
    const maxVal = Math.max(...categoryProjections.map(c => c.projected), 1);

    const categoryBarsHTML = categoryProjections.map(({ category, spent, projected: catProj }) => {
        const spentPct    = Math.round((spent   / maxVal) * 100);
        const projPct     = Math.round((catProj / maxVal) * 100);
        const extraPct    = Math.max(0, projPct - spentPct);

        return `
        <div class="cat-forecast-item">
            <div class="cat-forecast-label">
                <span>${escapeHtml(category)}</span>
                <span class="cat-forecast-values">
                    ${formatMoney(spent)} spent &rarr; ${formatMoney(catProj)} projected
                </span>
            </div>
            <div class="cat-forecast-bar-track">
                <div class="cat-forecast-bar-spent"    style="width:${spentPct}%"></div>
                <div class="cat-forecast-bar-projected" style="width:${extraPct}%"></div>
            </div>
        </div>`;
    }).join('');

    // ── Render ────────────────────────────────────────────────────────────────
    panel.innerHTML = `
        <div class="forecast-summary">
            <div class="forecast-metric">
                <span class="metric-label">Projected Spend</span>
                <span class="metric-value ${projected > budget ? 'metric-danger' : ''}">
                    ${formatMoney(projected)}
                </span>
                <span class="metric-sub">
                    ${projected > budget
                        ? `${formatMoney(projectedOverspend)} over budget`
                        : `₹${Math.round(budget - projected).toLocaleString()} under budget`}
                </span>
            </div>
            <div class="forecast-metric">
                <span class="metric-label">Safe Daily Limit</span>
                <span class="metric-value ${safeDailyLimit < 0 ? 'metric-danger' : ''}">
                    ${formatMoney(safeDailyLimit > 0 ? safeDailyLimit : 0)}
                </span>
                <span class="metric-sub">${daysRemaining} days remaining</span>
            </div>
            <div class="forecast-metric">
                <span class="metric-label">Budget Lasts</span>
                <span class="metric-value ${daysUntilEmpty < daysRemaining ? 'metric-danger' : ''}">
                    ${daysUntilEmptyText}
                </span>
                <span class="metric-sub">at ${formatMoney(dailyAvg)}/day avg</span>
            </div>
        </div>
        <h4 class="forecast-subtitle">Category Projections</h4>
        <div class="category-forecasts">${categoryBarsHTML}</div>
    `;
}
