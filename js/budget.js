// Budget page: set the monthly budget and see the forecast and risk level.

const budgetInput = document.getElementById('budgetInput');

// Set monthly budget
async function setBudget() {
    const value = parseFloat(budgetInput.value);

    if (value > 0) {
        try {
            await api(`${API_URL}/budget`, { method: 'POST', body: { amount: value } });

            budget = value;
            console.log('Budget set to:', budget);

            updateStats();
            checkBudget();
            forecastBudget();
            showToast('Budget updated!', 'success');

        } catch (err) {
            console.error('Failed to save budget:', err);
            showToast(err.message, 'error');
        }
    } else {
        showToast('Please enter a valid budget amount', 'warning');
    }
}

async function initBudget() {
    await loadMonthData();

    if (budget > 0) {
        budgetInput.value = budget;
    }
    checkBudget();
    forecastBudget();

    document.getElementById('setBudgetBtn').onclick = setBudget;
}

startPage('budget', initBudget);
