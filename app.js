// Global variables for storing data
let expenses = [];
let budget = 0;
let categoryChart = null;
let timeChart = null;

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

// Initialize the app when page loads
function init() {
    console.log('Initializing app...');
    
    // Load data from localStorage
    loadData();
    
    // Set date restrictions to current month only
    setDateRestrictions();
    
    // Show existing expenses
    renderExpenses();
    updateStats();
    initCharts();
    
    // Setup event listeners
    expenseForm.addEventListener('submit', addExpense);
    setBudgetBtn.addEventListener('click', setBudget);
    clearAllBtn.addEventListener('click', clearAllExpenses);
    
    console.log('App initialized successfully!');
}

// Restrict date input to current month only
function setDateRestrictions() {
    const dateInput = document.getElementById('expenseDate');
    const today = new Date();
    
    // Get first day of current month
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get last day of current month
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Format dates as YYYY-MM-DD for input
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    dateInput.min = formatDate(firstDay);
    dateInput.max = formatDate(lastDay);
    dateInput.value = formatDate(today); // Set to today by default
    
    console.log('Date restricted to current month:', formatDate(firstDay), 'to', formatDate(lastDay));
}

// Load data from localStorage
function loadData() {
    // Get expenses from localStorage
    const savedExpenses = localStorage.getItem('expenses');
    if (savedExpenses) {
        expenses = JSON.parse(savedExpenses);
        console.log('Loaded expenses:', expenses.length);
    }
    
    // Get budget from localStorage
    const savedBudget = localStorage.getItem('budget');
    if (savedBudget) {
        budget = parseFloat(savedBudget);
        budgetInput.value = budget;
        console.log('Loaded budget:', budget);
    }
}

// Add new expense
function addExpense(e) {
    e.preventDefault();
    
    // Get form values
    const expense = {
        id: Date.now(), // using timestamp as unique ID
        name: document.getElementById('expenseName').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        category: document.getElementById('expenseCategory').value,
        date: document.getElementById('expenseDate').value,
        timestamp: new Date().getTime()
    };
    
    console.log('Adding expense:', expense);
    
    // Add to expenses array
    expenses.push(expense);
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Reset form
    expenseForm.reset();
    
    // Reset date to today (within current month)
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
    
    // Show success message on button
    const addButton = expenseForm.querySelector('button[type="submit"]');
    addButton.textContent = '✓ Added!';
    addButton.style.background = '#2E8B57';
    setTimeout(() => {
        addButton.textContent = 'Add Expense';
        addButton.style.background = '';
    }, 1500);
}

// Set monthly budget
function setBudget() {
    const value = parseFloat(budgetInput.value);
    
    if (value > 0) {
        budget = value;
        localStorage.setItem('budget', budget);
        console.log('Budget set to:', budget);
        
        updateStats();
        checkBudget();
        
        // Success feedback
        setBudgetBtn.textContent = '✓ Set!';
        setBudgetBtn.style.background = '#2E8B57';
        setTimeout(() => {
            setBudgetBtn.textContent = 'Set Budget';
            setBudgetBtn.style.background = '';
        }, 1500);
    } else {
        alert('Please enter a valid budget amount');
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
                <button class="btn-icon btn-delete" onclick="deleteExpense(${expense.id})" title="Delete">🗑️</button>
            </div>
        </div>
        `;
    }
    
    expensesList.innerHTML = html;
}

// Get all expenses (no filters)
function getFilteredExpenses() {
    // Return all expenses
    return [...expenses];
}

// Delete an expense
function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        console.log('Deleting expense with id:', id);
        expenses = expenses.filter(exp => exp.id !== id);
        saveToLocalStorage();
        renderExpenses();
        updateStats();
        updateCharts();
        checkBudget();
    }
}

// Clear all expenses
function clearAllExpenses() {
    if (confirm('Are you sure you want to delete ALL expenses? This cannot be undone!')) {
        console.log('Clearing all expenses');
        expenses = [];
        saveToLocalStorage();
        renderExpenses();
        updateStats();
        updateCharts();
        checkBudget();
    }
}

// Update statistics in header
function updateStats() {
    // Calculate total spent
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
        
        // Add each category
        for (let category in categoryData) {
            labels.push(category);
            data.push(categoryData[category]);
            colors.push(categoryColors[category]);
        }
        
        // Calculate and add remaining budget
        const totalSpent = data.reduce((sum, val) => sum + val, 0);
        const remaining = budget - totalSpent;
        
        if (remaining > 0) {
            labels.push('Remaining Budget');
            data.push(remaining);
            colors.push('#D1D5DB'); // Gray for remaining
        }
        
        categoryChart.data.labels = labels;
        categoryChart.data.datasets[0].data = data;
        categoryChart.data.datasets[0].backgroundColor = colors;
    } else {
        // No budget set, just show category breakdown
        categoryChart.data.labels = Object.keys(categoryData);
        categoryChart.data.datasets[0].data = Object.values(categoryData);
        categoryChart.data.datasets[0].backgroundColor = Object.keys(categoryData).map(cat => categoryColors[cat]);
    }
    
    categoryChart.update();
    
    // Update bar chart - last 7 days
    const last7Days = [];
    const today = new Date();
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }
    
    // Calculate spending for each day
    const dailyData = [];
    for (let i = 0; i < last7Days.length; i++) {
        const date = last7Days[i];
        let dayTotal = 0;
        
        for (let j = 0; j < filtered.length; j++) {
            if (filtered[j].date === date) {
                dayTotal += filtered[j].amount;
            }
        }
        
        dailyData.push(dayTotal);
    }
    
    // Update chart labels and data
    timeChart.data.labels = last7Days.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
    timeChart.data.datasets[0].data = dailyData;
    timeChart.update();
    
    console.log('Charts updated');
}

// Save expenses to localStorage
function saveToLocalStorage() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    console.log('Data saved to localStorage');
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Show "Today" or "Yesterday" for recent dates
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        // Otherwise show formatted date
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    }
}

// Start the app when page loads
document.addEventListener('DOMContentLoaded', init);

// TODO: Add edit functionality for expenses
// TODO: Maybe add export to CSV feature later
