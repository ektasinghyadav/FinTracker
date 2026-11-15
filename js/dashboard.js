// Dashboard page: total spent, remaining budget, forecast and the latest expenses.

// The two stat cards shown in the header on this page
const DASHBOARD_STATS = `
    <div class="stat-card">
        <span class="stat-label">Total Spent</span>
        <span class="stat-value" id="totalSpent">₹0.00</span>
    </div>
    <div class="stat-card">
        <span class="stat-label">Budget Remaining</span>
        <span class="stat-value" id="budgetRemaining">₹0.00</span>
    </div>
`;

async function initDashboard() {
    await loadMonthData();
    updateStats();
    checkBudget();
    forecastBudget();
    showRecentExpenses();
}

// Show the 5 latest expenses of this month (read-only; edit and delete are on History)
function showRecentExpenses() {
    const list = document.getElementById('recentList');

    if (expenses.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>No expenses this month. <a href="add-expense.html">Add your first expense</a> to get started!</p>
            </div>
        `;
        return;
    }

    // newest date first; for the same date, the one entered last comes first
    const latest = [...expenses]
        .sort((a, b) => b.date.localeCompare(a.date) || b.timestamp - a.timestamp)
        .slice(0, 5);

    list.innerHTML = latest.map(expense => expenseRowHTML(expense, false)).join('');
}

startPage('dashboard', initDashboard, DASHBOARD_STATS);
