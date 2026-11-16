// AI Insights page: the streamed AI summary and the rule-based insights.

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
            insights.push({ text: `You've exceeded your monthly budget by ${formatMoney((total - budget))}.`, type: 'danger' });
        } else if (pct >= 80) {
            insights.push({ text: `You've used ${pct}% of your monthly budget (${formatMoney(total)} of ${formatMoney(budget)}). Spend carefully.`, type: 'warning' });
        } else {
            insights.push({ text: `You've used ${pct}% of your monthly budget (${formatMoney(total)} of ${formatMoney(budget)}).`, type: 'success' });
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
        insights.push({ text: `Your highest spending category is ${escapeHtml(topCategory[0])} at ${formatMoney(topCategory[1])} (${pct}% of total spending).`, type: 'default' });
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
            insights.push({ text: `You've spent ${Math.round(diff)}% more this week (${formatMoney(thisWeekTotal)}) compared to last week (${formatMoney(lastWeekTotal)}).`, type: 'warning' });
        } else if (diff < -10) {
            insights.push({ text: `Great job! You've spent ${Math.abs(Math.round(diff))}% less this week (${formatMoney(thisWeekTotal)}) compared to last week (${formatMoney(lastWeekTotal)}).`, type: 'success' });
        } else {
            insights.push({ text: `Your spending this week (${formatMoney(thisWeekTotal)}) is on par with last week (${formatMoney(lastWeekTotal)}).`, type: 'default' });
        }
    } else if (thisWeekTotal > 0) {
        insights.push({ text: `You've spent ${formatMoney(thisWeekTotal)} so far this week.`, type: 'default' });
    }

    // ── 4. Projected end-of-month spending ───────────────────────────────────
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;
    const dailyAvg = total / dayOfMonth;
    const projected = Math.round(dailyAvg * daysInMonth);

    if (dayOfMonth > 3 && daysRemaining > 0) {
        if (budget > 0 && projected > budget) {
            insights.push({ text: `At your current rate of ${formatMoney(dailyAvg)}/day, you may spend ${formatMoney(projected)} this month — ${formatMoney(projected - Math.round(budget))} over budget.`, type: 'danger' });
        } else {
            insights.push({ text: `At your current rate of ${formatMoney(dailyAvg)}/day, your projected spending for this month is ${formatMoney(projected)}.`, type: 'default' });
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
        insights.push({ text: `Unusual spike detected: you spent ${formatMoney(spikeEntry[1])} on ${spikeDate}, more than twice your daily average of ${formatMoney(avgPerActiveDay)}.`, type: 'warning' });
    }

    // ── Render ────────────────────────────────────────────────────────────────
    panel.innerHTML = insights.map(({ text, type }) => `
        <div class="insight-item ${type !== 'default' ? 'insight-' + type : ''}">
            <span class="insight-dot"></span>
            <p>${text}</p>
        </div>
    `).join('');
}

// Generate a streaming AI summary of the user's month (GET /api/stream/summary)
// The server reads the spending from the database; text streams in as the AI writes it.
// If anything goes wrong an error and a "Try again" button are shown.
async function generateAISummary() {
    const btn      = document.getElementById('generateSummaryBtn');
    const output   = document.getElementById('aiSummaryOutput');
    const text     = document.getElementById('aiSummaryText');
    const cursor   = document.getElementById('streamCursor');
    const errorBox = document.getElementById('aiSummaryError');

    if (expenses.length === 0) {
        showToast('Add some expenses first so AI has data to summarise.', 'warning');
        return;
    }

    // Show the output area and reset it
    output.classList.remove('hidden');
    errorBox.classList.add('hidden');
    text.textContent = '';
    cursor.style.display = 'inline';
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        const res = await fetch(`${API_URL}/stream/summary?today=${localDateString(new Date())}`);

        if (!res.ok) {
            let message = 'The summary could not be created. Please try again.';
            try { message = (await res.json()).error || message; } catch (err) { /* keep the default */ }
            throw new Error(message);
        }

        // Read the response stream chunk by chunk
        // Each chunk is a small piece of text — we append it directly to the page
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            text.textContent += decoder.decode(value, { stream: true });
        }

    } catch (err) {
        console.error('AI summary error:', err.message);
        // fetch gives a vague message when the stream breaks half way, so say it clearly
        const message = err instanceof TypeError ? 'The summary was interrupted. Please try again.' : err.message;
        document.getElementById('aiSummaryErrorText').textContent = message;
        errorBox.classList.remove('hidden');
    } finally {
        cursor.style.display = 'none';
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

async function initInsights() {
    await loadMonthData();
    generateInsights();

    document.getElementById('generateSummaryBtn').onclick = generateAISummary;
    document.getElementById('retrySummaryBtn').onclick = generateAISummary;
}

startPage('insights', initInsights);
