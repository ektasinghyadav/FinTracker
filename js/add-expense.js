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
                <span>Understood: <strong>₹${escapeHtml(data.amount || '?')}</strong> &middot;
                      <strong>${escapeHtml(data.category)}</strong> &middot;
                      <em>${escapeHtml(data.description)}</em></span>
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
        preview.innerHTML = `<p class="preview-error">⚠️ ${escapeHtml(err.message)}</p>`;
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
