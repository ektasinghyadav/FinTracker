// History page: all expenses with month and date filters, edit, delete and clear all.

let listExpenses = [];  // the expenses shown in the list (follows the filter)
let listFilter = { type: 'month', month: '' }; // current filter: month, range or all
let editingId = null;   // id of the expense open in the edit window

const expensesList = document.getElementById('expensesList');

// Turns the current filter into the query text for GET /api/expenses
function listQuery() {
    if (listFilter.type === 'month') {
        return `?month=${listFilter.month}`;
    }
    if (listFilter.type === 'range') {
        const params = new URLSearchParams();
        if (listFilter.from) params.set('from', listFilter.from);
        if (listFilter.to)   params.set('to', listFilter.to);
        return `?${params.toString()}`;
    }
    return ''; // "all"
}

// Is the list showing the same data as this month's expenses?
function isCurrentMonthView() {
    return listFilter.type === 'month' && listFilter.month === currentMonth();
}

// Fill listExpenses from the server according to the current filter
async function loadList() {
    listExpenses = await api(`${API_URL}/expenses${listQuery()}`);
}

// Short sentence under the filter that says what the list is showing
function updateListLabel() {
    const label = document.getElementById('listFilterLabel');
    let what;

    if (listFilter.type === 'month') {
        const [year, month] = listFilter.month.split('-');
        what = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (listFilter.type === 'range') {
        what = `${listFilter.from || 'the beginning'} to ${listFilter.to || 'today and later'}`;
    } else {
        what = 'all expenses';
    }

    label.textContent = `Showing ${what} — ${listExpenses.length} expense${listExpenses.length === 1 ? '' : 's'}`;
}

function setupListFilters() {
    const select = document.getElementById('filterMonth');
    select.innerHTML = '';

    // The month dropdown lists the last 12 months, newest first
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const option = document.createElement('option');
        option.value = localDateString(d).slice(0, 7);
        option.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        select.appendChild(option);
    }

    document.getElementById('filterFrom').value = '';
    document.getElementById('filterTo').value = '';

    document.getElementById('applyFilterBtn').onclick = applyListFilter;
    document.getElementById('thisMonthBtn').onclick = () => {
        select.value = currentMonth();
        document.getElementById('filterFrom').value = '';
        document.getElementById('filterTo').value = '';
        listFilter = { type: 'month', month: currentMonth() };
        reloadList();
    };
    document.getElementById('showAllBtn').onclick = () => {
        document.getElementById('filterFrom').value = '';
        document.getElementById('filterTo').value = '';
        listFilter = { type: 'all' };
        reloadList();
    };

    updateListLabel();
}

// "Apply" button: a custom date range wins if either date is filled, otherwise use the month
function applyListFilter() {
    const from = document.getElementById('filterFrom').value;
    const to   = document.getElementById('filterTo').value;

    if (from || to) {
        if (from && to && from > to) {
            showToast('The From date must not be after the To date', 'warning');
            return;
        }
        listFilter = { type: 'range', from, to };
    } else {
        listFilter = { type: 'month', month: document.getElementById('filterMonth').value };
    }

    reloadList();
}

async function reloadList() {
    try {
        await loadList();
        renderExpenses();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Render expenses list (shows listExpenses, which follows the filter)
function renderExpenses() {
    updateListLabel();

    // Show empty state if no expenses
    if (listExpenses.length === 0) {
        const message = isCurrentMonthView()
            ? 'No expenses yet. Add your first expense to get started!'
            : 'No expenses match this filter.';
        expensesList.innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
            </div>
        `;
        return;
    }

    // Sort by date (newest first)
    const sorted = [...listExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    expensesList.innerHTML = sorted.map(expense => expenseRowHTML(expense, true)).join('');
}

// ─── EDIT, DELETE AND CLEAR ALL ───────────────────────────────────────────────

function setupEditModal() {
    document.getElementById('editForm').onsubmit = saveEdit;
    document.getElementById('editCancelBtn').onclick = closeEditModal;
    // clicking the dark area outside the window closes it too
    document.getElementById('editModal').onclick = (e) => {
        if (e.target.id === 'editModal') closeEditModal();
    };
}

// Open the edit window filled with the expense's current values
function openEditModal(id) {
    const expense = listExpenses.find(exp => exp._id === id);
    if (!expense) return;

    editingId = id;
    document.getElementById('editName').value     = expense.name;
    document.getElementById('editAmount').value   = expense.amount;
    document.getElementById('editCategory').value = expense.category;
    document.getElementById('editDate').value     = expense.date;
    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    editingId = null;
    document.getElementById('editModal').classList.add('hidden');
}

// Save the edited expense (PUT /api/expenses/:id)
async function saveEdit(e) {
    e.preventDefault();
    if (!editingId) return;

    const expenseData = {
        name: document.getElementById('editName').value,
        amount: parseFloat(document.getElementById('editAmount').value),
        category: document.getElementById('editCategory').value,
        date: document.getElementById('editDate').value
    };

    try {
        await api(`${API_URL}/expenses/${editingId}`, { method: 'PUT', body: expenseData });
        closeEditModal();
        await reloadList();
        showToast('Expense updated!', 'success');
    } catch (err) {
        console.error('Failed to update expense:', err);
        showToast(err.message, 'error');
    }
}

// Delete an expense
async function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        console.log('Deleting expense with id:', id);

        try {
            await api(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
            await reloadList();
            showToast('Expense deleted', 'success');

        } catch (err) {
            console.error('Failed to delete expense:', err);
            showToast(err.message, 'error');
        }
    }
}

// Clear all expenses
async function clearAllExpenses() {
    if (confirm('Are you sure you want to delete ALL expenses? This cannot be undone!')) {
        console.log('Clearing all expenses');

        try {
            await api(`${API_URL}/expenses`, { method: 'DELETE' });
            await reloadList();
            showToast('All expenses cleared', 'success');

        } catch (err) {
            console.error('Failed to clear expenses:', err);
            showToast(err.message, 'error');
        }
    }
}

async function initHistory() {
    listFilter = { type: 'month', month: currentMonth() };
    await loadList();

    document.getElementById('clearAllBtn').onclick = clearAllExpenses;
    setupListFilters();
    setupEditModal();
    renderExpenses();
}

startPage('history', initHistory);
