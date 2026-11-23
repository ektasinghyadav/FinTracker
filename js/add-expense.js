// Add Expense page: the one-line AI box and the manual form.

const expenseForm = document.getElementById('expenseForm');

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

// Auto-suggest the category from the description field (manual form)
// Triggered when user clicks away from the Description input (blur event)
async function autoClassifyFromDescription() {
    const description = document.getElementById('expenseName').value.trim();
    const badge = document.getElementById('aiCategoryBadge');

    if (!description || description.length < 3) return;

    // Show a "thinking" state in the badge while we wait for AI
    badge.textContent = 'AI thinking...';
    badge.classList.remove('hidden');

    try {
        const data = await api(`${API_URL}/ai/classify`, {
            method: 'POST',
            body: { text: description, today: localDateString(new Date()) }
        });

        document.getElementById('expenseCategory').value = data.category;
        badge.textContent = data.source === 'ai' ? 'AI suggested' : 'Suggested';

    } catch (err) {
        // Silently fail — user can still pick a category manually
        badge.classList.add('hidden');
        console.error('Auto-classify failed:', err.message);
    }
}

// Handle natural language expense entry
// Flow: user types sentence -> server reads it (POST /api/ai/classify) -> form auto-fills -> user confirms
async function handleNLParse() {
    const input = document.getElementById('nlInput');
    const btn = document.getElementById('nlParseBtn');
    const preview = document.getElementById('nlPreview');
    const text = input.value.trim();

    if (!text) {
        showToast('Please type an expense description first', 'warning');
        return;
    }

    // Show loading state while waiting for the server
    btn.classList.add('loading');
    btn.disabled = true;
    preview.classList.add('hidden');

    try {
        const data = await api(`${API_URL}/ai/classify`, {
            method: 'POST',
            body: { text, today: localDateString(new Date()) }
        });

        // Auto-fill the expense form with what was understood
        if (data.description) document.getElementById('expenseName').value = data.description;
        if (data.amount)      document.getElementById('expenseAmount').value = data.amount;
        if (data.category)    document.getElementById('expenseCategory').value = data.category;
        if (data.date)        document.getElementById('expenseDate').value = data.date;

        // Show a preview card so the user can see what was understood
        const usedAI = data.source === 'ai';
        preview.innerHTML = `
            <div class="preview-content">
                <span class="ai-badge">${usedAI ? 'AI' : 'Auto'}</span>
                <span>Understood: <strong>₹${escapeHtml(data.amount || '?')}</strong> &middot;
                      <strong>${escapeHtml(data.category)}</strong> &middot;
                      <em>${escapeHtml(data.description)}</em></span>
            </div>
            ${usedAI ? '' : '<p class="preview-hint">The AI is not available right now, so a simple keyword check was used. Please double-check the form.</p>'}
            <p class="preview-hint">Review the form below and click <strong>Add Expense</strong> to save.</p>
        `;
        preview.classList.remove('hidden');

        // Clear the NL input field
        input.value = '';

        // Scroll down so user can see the filled form
        expenseForm.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (err) {
        // Nothing was filled in: the manual form is still right here (FR-2.6)
        console.error('NL parse error:', err.message);
        preview.innerHTML = `<p class="preview-error">⚠️ ${escapeHtml(err.message)} You can fill in the form below by hand.</p>`;
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
        date: document.getElementById('expenseDate').value
    };

    try {
        // POST the new expense to our server — it saves it to MongoDB
        await api(`${API_URL}/expenses`, { method: 'POST', body: expenseData });

        // Reset form and clear the AI category badge
        expenseForm.reset();
        document.getElementById('aiCategoryBadge').classList.add('hidden');
        document.getElementById('expenseDate').value = localDateString(new Date());

        showToast('Expense added successfully!', 'success');

    } catch (err) {
        console.error('Failed to add expense:', err);
        showToast(err.message, 'error');
    }
}

function initAddExpense() {
    setDateRestrictions();

    expenseForm.onsubmit = addExpense;
    document.getElementById('nlParseBtn').onclick = handleNLParse;
    document.getElementById('nlInput').onkeydown = (e) => {
        if (e.key === 'Enter') handleNLParse();
    };
    document.getElementById('expenseName').onblur = autoClassifyFromDescription;
    document.getElementById('expenseCategory').onchange = () => {
        document.getElementById('aiCategoryBadge').classList.add('hidden');
    };
}

startPage('add-expense', initAddExpense);
