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

// Currently logged-in user ({ name, email }) — null if not authenticated
let currentUser = null;

// ─── AUTH FUNCTIONS ───────────────────────────────────────────────────────────

async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            currentUser = await res.json();
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

function showAuthScreen() {
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function hideAuthScreen() {
    document.getElementById('authOverlay').classList.add('hidden');
}

function showUserInHeader() {
    document.getElementById('userName').textContent = `Hi, ${currentUser.name}`;
}

async function handleLogin(e) {
    e.preventDefault();
    const btn      = e.target.querySelector('button[type="submit"]');
    const errorEl  = document.getElementById('loginError');

    btn.classList.add('loading');
    errorEl.classList.add('hidden');

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email:    document.getElementById('loginEmail').value,
                password: document.getElementById('loginPassword').value
            })
        });

        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error;
            errorEl.classList.remove('hidden');
            return;
        }

        currentUser = data;
        hideAuthScreen();
        await initApp();

    } catch (err) {
        errorEl.textContent = 'Login failed. Please try again.';
        errorEl.classList.remove('hidden');
    } finally {
        btn.classList.remove('loading');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn     = e.target.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('registerError');

    btn.classList.add('loading');
    errorEl.classList.add('hidden');

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name:     document.getElementById('registerName').value,
                email:    document.getElementById('registerEmail').value,
                password: document.getElementById('registerPassword').value
            })
        });

        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error;
            errorEl.classList.remove('hidden');
            return;
        }

        currentUser = data;
        hideAuthScreen();
        await initApp();

    } catch (err) {
        errorEl.textContent = 'Registration failed. Please try again.';
        errorEl.classList.remove('hidden');
    } finally {
        btn.classList.remove('loading');
    }
}

async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    expenses    = [];
    budget      = 0;

    // Reset all UI panels
    renderExpenses();
    updateStats();
    updateCharts();
    checkBudget();
    forecastBudget();
    generateInsights();
    document.getElementById('aiSummaryOutput').classList.add('hidden');
    document.getElementById('budgetInput').value = '';

    showAuthScreen();
}

// ─── AUTH TAB SWITCHING ───────────────────────────────────────────────────────

function setupAuthTabs() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            document.getElementById('loginForm').classList.toggle('hidden',    target !== 'login');
            document.getElementById('registerForm').classList.toggle('hidden', target !== 'register');
        });
    });

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// Global variables for storing data
let expenses = [];
let budget = 0;
let categoryChart = null;
let timeChart = null;

// Base URL for our Express API
// Using a relative path so it works both locally and on Vercel
const API_URL = '/api';

// Get DOM elements
const expenseForm = document.getElementById('expenseForm');
const expensesList = document.getElementById('expensesList');
const budgetInput = document.getElementById('budgetInput');
const setBudgetBtn = document.getElementById('setBudgetBtn');
const budgetAlert = document.getElementById('budgetAlert');
const totalSpentEl = document.getElementById('totalSpent');
const budgetRemainingEl = document.getElementById('budgetRemaining');
const clearAllBtn = document.getElementById('clearAllBtn');

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

// Entry point — check auth first, then load the app or show login screen
async function init() {
    setupAuthTabs();

    const authenticated = await checkAuth();

    if (!authenticated) {
        showAuthScreen();
        return;
    }

    await initApp();
}

// Runs after successful login or on page load when already authenticated
async function initApp() {
    console.log('Initializing app...');

    showUserInHeader();

    // Load data from server
    await loadData();

    // Hide loading overlay now that data is ready
    document.getElementById('loadingOverlay').classList.add('hidden');

    // Set date restrictions to current month only
    setDateRestrictions();

    // Show existing expenses
    renderExpenses();
    updateStats();
    initCharts();
    forecastBudget();
    generateInsights();

    // Setup event listeners (guard against double-binding on re-login)
    expenseForm.onsubmit        = addExpense;
    setBudgetBtn.onclick        = setBudget;
    clearAllBtn.onclick         = clearAllExpenses;
    document.getElementById('nlParseBtn').onclick         = handleNLParse;
    document.getElementById('generateSummaryBtn').onclick = generateAISummary;

    document.getElementById('nlInput').onkeydown = (e) => {
        if (e.key === 'Enter') handleNLParse();
    };

    document.getElementById('expenseName').onblur = autoClassifyFromDescription;

    document.getElementById('expenseCategory').onchange = () => {
        document.getElementById('aiCategoryBadge').classList.add('hidden');
    };

    console.log('App initialized successfully!');
}

// Restrict date input to current month only
function setDateRestrictions() {
    const dateInput = document.getElementById('expenseDate');
    const today = new Date();

    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    dateInput.min = formatDate(firstDay);
    dateInput.max = formatDate(lastDay);
    dateInput.value = formatDate(today);

    console.log('Date restricted to current month:', formatDate(firstDay), 'to', formatDate(lastDay));
}

// Load expenses and budget from our server API
// (was: reading from localStorage)
async function loadData() {
    try {
        // Fetch expenses and budget at the same time (parallel requests)
        const [expensesRes, budgetRes] = await Promise.all([
            fetch(`${API_URL}/expenses`),
            fetch(`${API_URL}/budget`)
        ]);

        expenses = await expensesRes.json();
        const budgetData = await budgetRes.json();
        budget = budgetData.amount;

        if (budget > 0) {
            budgetInput.value = budget;
        }

        console.log('Loaded expenses:', expenses.length, '| Budget:', budget);
    } catch (err) {
        console.error('Failed to load data from server:', err);
        showToast('Could not connect to the server. Run: npm run dev', 'error');
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
                <span>${category}</span>
                <span class="cat-forecast-values">
                    ₹${Math.round(spent).toLocaleString()} spent &rarr; ₹${Math.round(catProj).toLocaleString()} projected
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
                    ₹${Math.round(projected).toLocaleString()}
                </span>
                <span class="metric-sub">
                    ${projected > budget
                        ? `₹${Math.round(projectedOverspend).toLocaleString()} over budget`
                        : `₹${Math.round(budget - projected).toLocaleString()} under budget`}
                </span>
            </div>
            <div class="forecast-metric">
                <span class="metric-label">Safe Daily Limit</span>
                <span class="metric-value ${safeDailyLimit < 0 ? 'metric-danger' : ''}">
                    ₹${safeDailyLimit > 0 ? Math.round(safeDailyLimit).toLocaleString() : '0'}
                </span>
                <span class="metric-sub">${daysRemaining} days remaining</span>
            </div>
            <div class="forecast-metric">
                <span class="metric-label">Budget Lasts</span>
                <span class="metric-value ${daysUntilEmpty < daysRemaining ? 'metric-danger' : ''}">
                    ${daysUntilEmptyText}
                </span>
                <span class="metric-sub">at ₹${Math.round(dailyAvg).toLocaleString()}/day avg</span>
            </div>
        </div>
        <h4 class="forecast-subtitle">Category Projections</h4>
        <div class="category-forecasts">${categoryBarsHTML}</div>
    `;
}

// Generate financial insights from the current expenses array
// Called after every data change — no API call needed, pure math
function generateInsights() {
    const panel = document.getElementById('insightsPanel');
    if (!panel) return;

    if (expenses.length === 0) {
        panel.innerHTML = '<p class="insights-empty">Add some expenses to see AI-powered insights.</p>';
        return;
    }

    const insights = []; // each entry: { text, type } where type = 'default'|'warning'|'danger'|'success'
    const now = new Date();

    // ── 1. Budget usage ──────────────────────────────────────────────────────
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    if (budget > 0) {
        const pct = Math.round((total / budget) * 100);
        if (pct > 100) {
            insights.push({ text: `You've exceeded your monthly budget by ₹${(total - budget).toFixed(0)}.`, type: 'danger' });
        } else if (pct >= 80) {
            insights.push({ text: `You've used ${pct}% of your monthly budget (₹${total.toFixed(0)} of ₹${budget.toFixed(0)}). Spend carefully.`, type: 'warning' });
        } else {
            insights.push({ text: `You've used ${pct}% of your monthly budget (₹${total.toFixed(0)} of ₹${budget.toFixed(0)}).`, type: 'success' });
        }
    }

    // ── 2. Highest spending category ─────────────────────────────────────────
    const byCategory = {};
    expenses.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
        const pct = Math.round((topCategory[1] / total) * 100);
        insights.push({ text: `Your highest spending category is ${topCategory[0]} at ₹${topCategory[1].toFixed(0)} (${pct}% of total spending).`, type: 'default' });
    }

    // ── 3. Week-over-week comparison ─────────────────────────────────────────
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - daysFromMonday);
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1); // one millisecond before this week started

    // Use noon (T12:00:00) to avoid timezone issues when parsing date strings
    const thisWeekTotal = expenses
        .filter(e => new Date(e.date + 'T12:00:00') >= thisWeekStart)
        .reduce((s, e) => s + e.amount, 0);

    const lastWeekTotal = expenses
        .filter(e => {
            const d = new Date(e.date + 'T12:00:00');
            return d >= lastWeekStart && d < thisWeekStart;
        })
        .reduce((s, e) => s + e.amount, 0);

    if (lastWeekTotal > 0) {
        const diff = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
        if (diff > 10) {
            insights.push({ text: `You've spent ${Math.round(diff)}% more this week (₹${thisWeekTotal.toFixed(0)}) compared to last week (₹${lastWeekTotal.toFixed(0)}).`, type: 'warning' });
        } else if (diff < -10) {
            insights.push({ text: `Great job! You've spent ${Math.abs(Math.round(diff))}% less this week (₹${thisWeekTotal.toFixed(0)}) compared to last week (₹${lastWeekTotal.toFixed(0)}).`, type: 'success' });
        } else {
            insights.push({ text: `Your spending this week (₹${thisWeekTotal.toFixed(0)}) is on par with last week (₹${lastWeekTotal.toFixed(0)}).`, type: 'default' });
        }
    } else if (thisWeekTotal > 0) {
        insights.push({ text: `You've spent ₹${thisWeekTotal.toFixed(0)} so far this week.`, type: 'default' });
    }

    // ── 4. Projected end-of-month spending ───────────────────────────────────
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;
    const dailyAvg = total / dayOfMonth;
    const projected = Math.round(dailyAvg * daysInMonth);

    if (dayOfMonth > 3 && daysRemaining > 0) {
        if (budget > 0 && projected > budget) {
            insights.push({ text: `At your current rate of ₹${dailyAvg.toFixed(0)}/day, you may spend ₹${projected} this month — ₹${projected - Math.round(budget)} over budget.`, type: 'danger' });
        } else {
            insights.push({ text: `At your current rate of ₹${dailyAvg.toFixed(0)}/day, your projected spending for this month is ₹${projected}.`, type: 'default' });
        }
    }

    // ── 5. Unusual spending spike detection ──────────────────────────────────
    const byDay = {};
    expenses.forEach(e => { byDay[e.date] = (byDay[e.date] || 0) + e.amount; });
    const dayTotals = Object.values(byDay);
    const avgPerActiveDay = dayTotals.reduce((s, v) => s + v, 0) / dayTotals.length;
    const today = now.toISOString().split('T')[0];

    const spikeEntry = Object.entries(byDay)
        .filter(([d]) => d !== today)               // exclude today (still in progress)
        .find(([, amt]) => amt > avgPerActiveDay * 2); // flag days with 2× average

    if (spikeEntry && avgPerActiveDay > 0) {
        const spikeDate = new Date(spikeEntry[0] + 'T12:00:00')
            .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        insights.push({ text: `Unusual spike detected: you spent ₹${spikeEntry[1].toFixed(0)} on ${spikeDate}, more than twice your daily average of ₹${avgPerActiveDay.toFixed(0)}.`, type: 'warning' });
    }

    // ── Render ────────────────────────────────────────────────────────────────
    panel.innerHTML = insights.map(({ text, type }) => `
        <div class="insight-item ${type !== 'default' ? 'insight-' + type : ''}">
            <span class="insight-dot"></span>
            <p>${text}</p>
        </div>
    `).join('');
}

// Generate a streaming AI summary of the user's finances
// Uses the Vercel AI SDK on the server + a HuggingFace generative model
// Text streams in word-by-word, like watching the AI "think and type"
async function generateAISummary() {
    const btn    = document.getElementById('generateSummaryBtn');
    const output = document.getElementById('aiSummaryOutput');
    const text   = document.getElementById('aiSummaryText');
    const cursor = document.getElementById('streamCursor');

    if (expenses.length === 0) {
        showToast('Add some expenses first so AI has data to summarise.', 'warning');
        return;
    }

    // Build stats from in-memory expenses
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const byCategory = {};
    expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    const now = new Date();
    const dailyAvg = (total / now.getDate()).toFixed(0);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate();

    // Show the output area and reset it
    output.classList.remove('hidden');
    text.textContent = '';
    cursor.style.display = 'inline';
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        const res = await fetch(`${API_URL}/ai/stream/summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                total: total.toFixed(0),
                budget,
                topCategory,
                dailyAvg,
                daysRemaining
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Stream request failed');
        }

        // Read the response stream chunk by chunk
        // Each chunk is a small piece of text — we append it directly to the DOM
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            text.textContent += chunk;
        }

    } catch (err) {
        console.error('AI summary error:', err.message);
        text.textContent = '⚠️ ' + err.message;
    } finally {
        cursor.style.display = 'none';
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

// Auto-classify category from the description field (manual form)
// Triggered when user clicks away from the Description input (blur event)
async function autoClassifyFromDescription() {
    const description = document.getElementById('expenseName').value.trim();
    const badge = document.getElementById('aiCategoryBadge');

    if (!description || description.length < 3) return;

    // Show a "thinking" state in the badge while we wait for AI
    badge.textContent = 'AI thinking...';
    badge.classList.remove('hidden');

    try {
        const res = await fetch(`${API_URL}/ai/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: description })
        });

        const data = await res.json();

        if (data.category) {
            document.getElementById('expenseCategory').value = data.category;
            const pct = Math.round((data.confidence || 0) * 100);
            badge.textContent = `AI suggested (${pct}%)`;
            console.log('AI classified:', description, '→', data.category, `(${pct}%)`);
        }
    } catch (err) {
        // Silently fail — user can still pick a category manually
        badge.classList.add('hidden');
        console.error('Auto-classify failed:', err.message);
    }
}

// Handle natural language expense parsing
// Flow: user types sentence → AI extracts data → form auto-fills → user confirms
async function handleNLParse() {
    const input = document.getElementById('nlInput');
    const btn = document.getElementById('nlParseBtn');
    const preview = document.getElementById('nlPreview');
    const text = input.value.trim();

    if (!text) {
        showToast('Please type an expense description first', 'warning');
        return;
    }

    // Show loading state while waiting for AI response
    btn.classList.add('loading');
    btn.disabled = true;
    preview.classList.add('hidden');

    try {
        const res = await fetch(`${API_URL}/ai/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const data = await res.json();

        if (data.error) throw new Error(data.error);

        // Auto-fill the expense form with what AI extracted
        if (data.description) document.getElementById('expenseName').value = data.description;
        if (data.amount)      document.getElementById('expenseAmount').value = data.amount;
        if (data.category)    document.getElementById('expenseCategory').value = data.category;
        if (data.date)        document.getElementById('expenseDate').value = data.date;

        // Show a preview card so user can see what AI understood
        const confidencePct = Math.round((data.confidence || 0) * 100);
        preview.innerHTML = `
            <div class="preview-content">
                <span class="ai-badge">AI</span>
                <span>Understood: <strong>₹${data.amount || '?'}</strong> &middot;
                      <strong>${data.category}</strong> &middot;
                      <em>${data.description}</em></span>
                <span class="confidence-badge">${confidencePct}% confident</span>
            </div>
            <p class="preview-hint">Review the form below and click <strong>Add Expense</strong> to save.</p>
        `;
        preview.classList.remove('hidden');

        // Clear the NL input field
        input.value = '';

        // Scroll down so user can see the filled form
        document.getElementById('expenseForm').scrollIntoView({ behavior: 'smooth', block: 'center' });

        console.log('AI parsed expense:', data);

    } catch (err) {
        console.error('NL parse error:', err.message);
        preview.innerHTML = `<p class="preview-error">⚠️ ${err.message}</p>`;
        preview.classList.remove('hidden');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// Add new expense
async function addExpense(e) {
    e.preventDefault();

    const expenseData = {
        name: document.getElementById('expenseName').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        category: document.getElementById('expenseCategory').value,
        date: document.getElementById('expenseDate').value,
        timestamp: new Date().getTime()
    };

    console.log('Adding expense:', expenseData);

    try {
        // POST the new expense to our server — it saves it to MongoDB
        const res = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expenseData)
        });

        // The server sends back the saved expense (now with a MongoDB _id)
        const savedExpense = await res.json();
        expenses.push(savedExpense);

        // Reset form and clear the AI category badge
        expenseForm.reset();
        document.getElementById('aiCategoryBadge').classList.add('hidden');

        // Reset date to today
        const today = new Date();
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        document.getElementById('expenseDate').value = formatDate(today);

        // Update UI
        renderExpenses();
        updateStats();
        updateCharts();
        checkBudget();
        forecastBudget();
        generateInsights();

        showToast('Expense added successfully!', 'success');

    } catch (err) {
        console.error('Failed to add expense:', err);
        showToast('Could not save expense. Is the server running?', 'error');
    }
}

// Set monthly budget
async function setBudget() {
    const value = parseFloat(budgetInput.value);

    if (value > 0) {
        try {
            await fetch(`${API_URL}/budget`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: value })
            });

            budget = value;
            console.log('Budget set to:', budget);

            updateStats();
            checkBudget();
            forecastBudget();
            generateInsights();
            showToast('Budget updated!', 'success');

        } catch (err) {
            console.error('Failed to save budget:', err);
            showToast('Could not save budget. Is the server running?', 'error');
        }
    } else {
        showToast('Please enter a valid budget amount', 'warning');
    }
}

// Render expenses list
function renderExpenses() {
    const filteredExpenses = getFilteredExpenses();

    console.log('Rendering', filteredExpenses.length, 'expenses');

    // Show empty state if no expenses
    if (filteredExpenses.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <p>No expenses yet. Add your first expense to get started!</p>
            </div>
        `;
        return;
    }

    // Sort by date (newest first)
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Create HTML for each expense
    // Note: we now use expense._id (MongoDB ID) instead of expense.id (timestamp)
    let html = '';
    for (let i = 0; i < filteredExpenses.length; i++) {
        const expense = filteredExpenses[i];
        html += `
        <div class="expense-item" style="border-left-color: ${categoryColors[expense.category]}">
            <div class="expense-info">
                <h4>${expense.name}</h4>
                <div class="expense-meta">
                    <span class="expense-category" style="background: ${categoryColors[expense.category]}">${expense.category}</span>
                    <span>${formatDate(expense.date)}</span>
                </div>
            </div>
            <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
            <div class="expense-actions">
                <button class="btn-icon btn-delete" onclick="deleteExpense('${expense._id}')" title="Delete">🗑️</button>
            </div>
        </div>
        `;
    }

    expensesList.innerHTML = html;
}

// Get all expenses (no filters)
function getFilteredExpenses() {
    return [...expenses];
}

// Delete an expense
async function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        console.log('Deleting expense with id:', id);

        try {
            await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });

            // Remove from local array so UI updates immediately
            expenses = expenses.filter(exp => exp._id !== id);

            renderExpenses();
            updateStats();
            updateCharts();
            checkBudget();
            forecastBudget();
            generateInsights();

        } catch (err) {
            console.error('Failed to delete expense:', err);
            showToast('Could not delete expense. Is the server running?', 'error');
        }
    }
}

// Clear all expenses
async function clearAllExpenses() {
    if (confirm('Are you sure you want to delete ALL expenses? This cannot be undone!')) {
        console.log('Clearing all expenses');

        try {
            await fetch(`${API_URL}/expenses`, { method: 'DELETE' });

            expenses = [];
            renderExpenses();
            updateStats();
            updateCharts();
            checkBudget();
            forecastBudget();
            generateInsights();

        } catch (err) {
            console.error('Failed to clear expenses:', err);
            showToast('Could not clear expenses. Is the server running?', 'error');
        }
    }
}

// Update statistics in header
function updateStats() {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = budget - total;

    totalSpentEl.textContent = `₹${total.toFixed(2)}`;
    budgetRemainingEl.textContent = `₹${remaining.toFixed(2)}`;

    // Color code the remaining amount
    if (remaining < 0) {
        budgetRemainingEl.style.color = '#E07A5F'; // Red
    } else if (remaining < budget * 0.2) {
        budgetRemainingEl.style.color = '#F4A261'; // Orange
    } else {
        budgetRemainingEl.style.color = '#2E8B57'; // Green
    }
}

// Check budget and show alerts
function checkBudget() {
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
        budgetAlert.textContent = `⚠️ You've exceeded your budget by ₹${Math.abs(remaining).toFixed(2)}!`;
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

// Initialize charts using Chart.js
function initCharts() {
    console.log('Initializing charts...');

    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const timeCtx = document.getElementById('timeChart').getContext('2d');

    // Create pie chart for categories
    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'DM Sans'
                        }
                    }
                }
            }
        }
    });

    // Create bar chart for daily spending
    timeChart = new Chart(timeCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Spending',
                data: [],
                backgroundColor: '#0A2342',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                }
            }
        }
    });

    updateCharts();
}

// Update chart data
function updateCharts() {
    if (!categoryChart || !timeChart) return;

    const filtered = getFilteredExpenses();

    // Update category chart - shows budget breakdown
    const categoryData = {};

    // Calculate spending per category
    for (let i = 0; i < filtered.length; i++) {
        const exp = filtered[i];
        if (!categoryData[exp.category]) {
            categoryData[exp.category] = 0;
        }
        categoryData[exp.category] += exp.amount;
    }

    // If budget is set, show remaining budget as well
    if (budget > 0) {
        const labels = [];
        const data = [];
        const colors = [];

        for (let category in categoryData) {
            labels.push(category);
            data.push(categoryData[category]);
            colors.push(categoryColors[category]);
        }

        const totalSpent = data.reduce((sum, val) => sum + val, 0);
        const remaining = budget - totalSpent;

        if (remaining > 0) {
            labels.push('Remaining Budget');
            data.push(remaining);
            colors.push('#D1D5DB');
        }

        categoryChart.data.labels = labels;
        categoryChart.data.datasets[0].data = data;
        categoryChart.data.datasets[0].backgroundColor = colors;
    } else {
        categoryChart.data.labels = Object.keys(categoryData);
        categoryChart.data.datasets[0].data = Object.values(categoryData);
        categoryChart.data.datasets[0].backgroundColor = Object.keys(categoryData).map(cat => categoryColors[cat]);
    }

    categoryChart.update();

    // Update bar chart - last 7 days
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }

    const dailyData = last7Days.map(date => {
        return filtered
            .filter(exp => exp.date === date)
            .reduce((sum, exp) => sum + exp.amount, 0);
    });

    timeChart.data.labels = last7Days.map(date => {
        return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    });
    timeChart.data.datasets[0].data = dailyData;
    timeChart.update();

    console.log('Charts updated');
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

// Start the app when page loads
document.addEventListener('DOMContentLoaded', init);
