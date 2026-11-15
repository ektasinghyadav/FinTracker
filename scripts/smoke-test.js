// Smoke test: checks every requirement (FR and NFR in the SRS) that can be checked
// through the HTTP API, and says which ones need a browser or a person.
//
// Run the server first, then:
//   node scripts/smoke-test.js                              (tests http://localhost:3000)
//   BASE_URL=https://your-app.vercel.app node scripts/smoke-test.js
//
// It creates two throwaway users and deletes them at the end. It needs no database access.
// Result words:  PASS = checked and fine,  FAIL = checked and wrong,
//                SKIP = could not be checked in this run (the note says why),
//                MANUAL = needs a browser or a person (the note says how it is checked).

const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const IS_HTTPS = BASE_URL.startsWith('https://');
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(BASE_URL);

const results = [];
function record(status, id, text, note) {
    results.push({ status, id, text, note: note || '' });
}
const pass = (id, text, note) => record('PASS', id, text, note);
const fail = (id, text, note) => record('FAIL', id, text, note);
const skip = (id, text, note) => record('SKIP', id, text, note);
const manual = (id, text, note) => record('MANUAL', id, text, note);
// pass if the condition is true, otherwise fail with the note
function check(id, text, condition, note) {
    (condition ? pass : fail)(id, text, condition ? '' : note);
}

// ─── A small HTTP client that keeps its own cookie ───────────────────────────

function newClient() {
    const client = { cookie: '' };
    client.call = async (method, urlPath, body) => {
        const started = Date.now();
        const res = await fetch(BASE_URL + urlPath, {
            method,
            headers: { 'Content-Type': 'application/json', ...(client.cookie ? { Cookie: client.cookie } : {}) },
            body: body ? JSON.stringify(body) : undefined
        });
        const setCookie = res.headers.get('set-cookie') || '';
        if (setCookie) client.cookie = setCookie.split(';')[0];

        const raw = await res.text();
        let data = raw;
        try { data = JSON.parse(raw); } catch (err) { /* plain text or html */ }
        return { status: res.status, data, raw, setCookie, ms: Date.now() - started, type: res.headers.get('content-type') || '' };
    };
    return client;
}

function pad(n) { return String(n).padStart(2, '0'); }
function dateText(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function median(list) { return [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)]; }

// Read a streamed text reply and note when each piece arrives
async function readStream(client, urlPath) {
    const started = Date.now();
    const res = await fetch(BASE_URL + urlPath, { headers: { Cookie: client.cookie } });
    if (res.status !== 200) {
        let data = null;
        try { data = await res.json(); } catch (err) { /* no json */ }
        return { status: res.status, data };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const pieces = [];
    let firstPieceMs = null;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstPieceMs === null) firstPieceMs = Date.now() - started;
        pieces.push(decoder.decode(value, { stream: true }));
    }
    return { status: 200, text: pieces.join(''), pieces: pieces.length, firstPieceMs, totalMs: Date.now() - started };
}

// ─── The checks ───────────────────────────────────────────────────────────────

async function run() {
    const now = new Date();
    const today = dateText(now);
    const thisMonth = today.slice(0, 7);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const lastMonth = dateText(lastMonthDate).slice(0, 7);
    const stamp = Date.now();

    const a = newClient();
    const b = newClient();
    const anon = newClient();
    const emailA = `smoke.a.${stamp}@example.com`;
    const emailB = `smoke.b.${stamp}@example.com`;

    // Pages (NFR-5.1)
    const pages = ['index', 'dashboard', 'add-expense', 'history', 'budget', 'analytics', 'insights', 'profile'];
    const pageResults = [];
    for (const name of pages) {
        const res = await anon.call('GET', `/${name}.html`);
        pageResults.push({ name, ok: res.status === 200 && /<html/i.test(res.raw) });
    }
    const missingPages = pageResults.filter(p => !p.ok).map(p => p.name);
    check('NFR-5.1', 'Separate pages per feature (Login, Dashboard, Add Expense, History, Budget, Analytics, AI Insights, Profile)',
        missingPages.length === 0, `missing or not served: ${missingPages.join(', ')}`);

    // FR-1.1 register, FR-1.2 duplicate, FR-1.3 no plaintext
    let res = await a.call('POST', '/api/auth/register', { name: 'Smoke A', email: emailA, password: 'secret123' });
    check('FR-1.1', 'Register with name, email and password', res.status === 201 && res.data.email === emailA, `status ${res.status}`);
    res = await anon.call('POST', '/api/auth/register', { name: 'Dup', email: emailA.toUpperCase(), password: 'secret123' });
    check('FR-1.2', 'Registration with an existing email is rejected (409)', res.status === 409, `status ${res.status}`);
    res = await b.call('POST', '/api/auth/register', { name: 'Smoke B', email: emailB, password: 'secret123' });
    const registerReply = JSON.stringify(res.data);
    const meReply = JSON.stringify((await b.call('GET', '/api/auth/me')).data);
    check('FR-1.3', 'No password (plain or hash) is returned by any route',
        !/password|\$2[aby]\$|secret123/i.test(registerReply + meReply), 'a password or hash was in a reply');

    // FR-1.4 login + httpOnly cookie, NFR-3.2
    const loginClient = newClient();
    res = await loginClient.call('POST', '/api/auth/login', { email: emailA, password: 'secret123' });
    check('FR-1.4', 'Login with email and password starts a session', res.status === 200 && !!loginClient.cookie, `status ${res.status}`);
    const flags = res.setCookie.toLowerCase();
    if (IS_HTTPS) {
        check('NFR-3.2', 'Session cookie is httpOnly and secure', flags.includes('httponly') && flags.includes('secure'), `cookie flags: ${res.setCookie}`);
    } else {
        check('NFR-3.2', 'Session cookie is httpOnly (the secure flag is added on HTTPS in production)', flags.includes('httponly'), `cookie flags: ${res.setCookie}`);
    }
    res = await anon.call('POST', '/api/auth/login', { email: emailA, password: 'wrong-password' });
    check('FR-1.4', 'Wrong password is rejected (401)', res.status === 401, `status ${res.status}`);

    // FR-1.5 logout
    res = await loginClient.call('POST', '/api/auth/logout');
    check('FR-1.5', 'Logout clears the session cookie', res.status === 200 && /token=;/.test(res.setCookie), `status ${res.status}, cookie: ${res.setCookie}`);
    loginClient.cookie = '';
    res = await loginClient.call('GET', '/api/auth/me');
    check('FR-1.5', 'After logout the session is gone (401)', res.status === 401, `status ${res.status}`);

    // FR-1.6 redirect
    res = await anon.call('GET', '/api/expenses');
    check('FR-1.6', 'Protected data without a session is refused (401)', res.status === 401, `status ${res.status}`);
    manual('FR-1.6', 'Protected pages redirect to the login page', 'done by the browser: every page runs a login check first and goes to index.html');

    // FR-2.1 add, FR-2.3 edit, FR-2.4 delete, FR-2.5 clear all
    const add = (name, amount, category, date) => a.call('POST', '/api/expenses', { name, amount, category, date });
    res = await add('Rent share', 6000, 'Bills & Utilities', `${thisMonth}-01`);
    check('FR-2.1', 'Add an expense by hand (description, amount, category, date)', res.status === 201 && res.data.name === 'Rent share', `status ${res.status}`);
    const rentId = res.data._id;
    await add('Groceries', 850, 'Food & Dining', `${thisMonth}-02`);
    await add('Headphones', 4500, 'Shopping', `${thisMonth}-03`);
    const oldRes = await add('Old shoes', 2200, 'Shopping', `${lastMonth}-12`);
    const oldId = oldRes.data._id;

    res = await a.call('POST', '/api/expenses', { name: 'x', amount: -5, category: 'Other', date: today });
    check('FR-2.1', 'Server rejects an amount that is not above 0 (400)', res.status === 400, `status ${res.status}`);

    res = await a.call('PUT', `/api/expenses/${rentId}`, { name: 'Rent (edited)', amount: 6500, category: 'Bills & Utilities', date: `${thisMonth}-01` });
    check('FR-2.3', 'Edit description and amount of an expense', res.status === 200 && res.data.name === 'Rent (edited)' && res.data.amount === 6500, `status ${res.status}`);
    res = await a.call('PUT', '/api/expenses/000000000000000000000001', { name: 'x', amount: 1, category: 'Other', date: today });
    check('FR-2.3', 'Editing an expense that does not exist gives 404', res.status === 404, `status ${res.status}`);

    res = await a.call('DELETE', `/api/expenses/${oldId}`);
    const afterDelete = await a.call('GET', '/api/expenses');
    check('FR-2.4', 'Delete one expense', res.status === 200 && afterDelete.data.length === 3, `status ${res.status}, left ${afterDelete.data.length}`);
    await add('Old shoes', 2200, 'Shopping', `${lastMonth}-12`);
    await add('Old groceries', 900, 'Food & Dining', `${lastMonth}-10`);

    // FR-3.x list and filters
    const all = await a.call('GET', '/api/expenses');
    const stamps = all.data.map(e => e.timestamp);
    check('FR-3.1', 'History lists the user\'s expenses, newest entered first',
        all.status === 200 && all.data.length === 5 && stamps.every((t, i) => i === 0 || stamps[i - 1] >= t), `status ${all.status}, count ${all.data && all.data.length}`);
    res = await a.call('GET', `/api/expenses?from=${thisMonth}-02&to=${thisMonth}-03`);
    check('FR-3.2', 'Filter by custom start and end date', res.status === 200 && res.data.length === 2 && res.data.every(e => e.date >= `${thisMonth}-02` && e.date <= `${thisMonth}-03`), `status ${res.status}, count ${res.data && res.data.length}`);
    res = await a.call('GET', '/api/expenses?from=2026-12-31&to=2026-01-01');
    check('FR-3.2', 'A start date after the end date is rejected (400)', res.status === 400, `status ${res.status}`);
    res = await a.call('GET', `/api/expenses?month=${lastMonth}`);
    check('FR-3.3', 'Filter by calendar month', res.status === 200 && res.data.length === 2 && res.data.every(e => e.date.startsWith(lastMonth)), `status ${res.status}, count ${res.data && res.data.length}`);

    // FR-4.x budget
    res = await a.call('POST', '/api/budget', { amount: 20000 });
    check('FR-4.1', 'Set the monthly budget', res.status === 200 && res.data.amount === 20000, `status ${res.status}`);
    res = await a.call('POST', '/api/budget', { amount: 25000 });
    const budgetNow = await a.call('GET', '/api/budget');
    check('FR-4.1', 'Updating the budget replaces it (one budget per user)', res.status === 200 && budgetNow.data.amount === 25000, `amount ${budgetNow.data && budgetNow.data.amount}`);
    res = await a.call('POST', '/api/budget', { amount: 0 });
    check('FR-4.1', 'A budget of 0 or less is rejected (400)', res.status === 400, `status ${res.status}`);
    const monthList = await a.call('GET', `/api/expenses?month=${thisMonth}`);
    const monthTotal = monthList.data.reduce((sum, e) => sum + e.amount, 0);
    check('FR-4.2', 'This month\'s expenses (for total and remaining budget) leave out older months', monthTotal === 6500 + 850 + 4500, `total ${monthTotal}`);
    manual('FR-4.2', 'Total spent and remaining budget are shown', 'calculated and displayed by the browser from this list');
    manual('FR-4.3', 'Budget forecast and risk level', 'calculated in the browser (Design 5.3); checked in the browser test');
    manual('FR-6.1', 'Category chart of this month', 'drawn in the browser; checked in the browser test');
    manual('FR-6.2', 'Daily spending chart of this month', 'drawn in the browser; checked in the browser test');

    // FR-2.2 classify, FR-2.6 fallback
    res = await a.call('POST', '/api/ai/classify', { text: 'spent 450 on dinner yesterday', today });
    const d = res.data || {};
    const categories = ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities', 'Healthcare', 'Education', 'Other'];
    check('FR-2.2', 'A sentence becomes amount, description, category and date',
        res.status === 200 && d.amount === 450 && typeof d.description === 'string' && d.description.length > 0 &&
        categories.includes(d.category) && /^\d{4}-\d{2}-\d{2}$/.test(d.date), `status ${res.status}, reply ${JSON.stringify(d)}`);
    if (d.source === 'rules') {
        pass('FR-2.6', 'AI not available: the keyword rules still fill the form (no error)', 'this run used the fallback');
    } else {
        skip('FR-2.6', 'Fallback when the AI is not available', 'the AI answered in this run; start the server without GROQ_API_KEY to see the fallback');
    }
    res = await a.call('POST', '/api/ai/classify', { text: 12345 });
    check('FR-2.2', 'classify rejects input that is not text (400)', res.status === 400, `status ${res.status}`);
    manual('FR-2.5', 'Clear all asks for a confirmation first', 'the confirmation box is in the browser; the delete itself is checked below');

    // FR-5.x summary
    const countBefore = (await a.call('GET', '/api/expenses')).data.length;
    const summary = await readStream(a, `/api/stream/summary?today=${today}`);
    let aiDown = false;
    if (summary.status === 200) {
        pass('FR-5.1', 'An AI summary is generated on request');
        check('FR-5.2', 'The summary arrives progressively, not all at once', summary.pieces > 1, `${summary.pieces} piece(s)`);
        check('FR-5.3', 'The summary names unusual spending', /unusual spending/i.test(summary.text), `text: ${summary.text.slice(0, 120)}`);
        check('FR-5.4', 'The summary includes a tip', /tip/i.test(summary.text), `text: ${summary.text.slice(0, 120)}`);
    } else if (summary.status === 502) {
        aiDown = true;
        const message = summary.data && summary.data.error;
        skip('FR-5.1', 'An AI summary is generated on request', `AI not available in this run: "${message}"`);
        skip('FR-5.2', 'Streaming', 'AI not available in this run');
        skip('FR-5.3', 'Unusual spending named', 'AI not available in this run');
        skip('FR-5.4', 'A tip included', 'AI not available in this run');
        check('NFR-2.2', 'When the AI fails, a clear message is shown (502 with a readable error)', typeof message === 'string' && message.length > 20, `reply: ${JSON.stringify(summary.data)}`);
    } else {
        fail('FR-5.1', 'An AI summary is generated on request', `unexpected status ${summary.status}`);
    }
    if (!aiDown) {
        skip('NFR-2.2', 'Clear message when the AI fails', 'the AI worked in this run; start the server without GROQ_API_KEY to see it');
    }

    // NFR-2.1 / NFR-7.1: core features and data are fine whatever the AI does
    const afterAI = await a.call('GET', '/api/expenses');
    check('NFR-7.1', 'AI calls do not change or delete stored expenses or the budget',
        afterAI.data.length === countBefore && (await a.call('GET', '/api/budget')).data.amount === 25000, `expenses ${countBefore} -> ${afterAI.data.length}`);
    if (aiDown) {
        const added = await add('Added while AI is down', 10, 'Other', today);
        check('NFR-2.1', 'Adding and viewing expenses still works while the AI is unavailable', added.status === 201, `status ${added.status}`);
        await a.call('DELETE', `/api/expenses/${added.data._id}`);
    } else {
        skip('NFR-2.1', 'Core features work while the AI is unavailable', 'the AI worked in this run; start the server without GROQ_API_KEY to check it');
    }

    // FR-7.x profile and password
    res = await a.call('GET', '/api/auth/me');
    check('FR-7.1', 'The logged-in user\'s name and email can be read', res.status === 200 && res.data.name === 'Smoke A' && res.data.email === emailA, `status ${res.status}`);
    res = await a.call('PUT', '/api/auth/profile', { name: 'Smoke A2', email: emailA });
    check('FR-7.2', 'Update name', res.status === 200 && res.data.name === 'Smoke A2', `status ${res.status}`);
    res = await a.call('PUT', '/api/auth/profile', { name: 'Smoke A2', email: emailB });
    check('FR-7.2', 'Changing to an email that is taken is rejected (409)', res.status === 409, `status ${res.status}`);
    res = await a.call('PUT', '/api/auth/password', { currentPassword: 'wrong-pass', newPassword: 'newsecret1' });
    check('FR-7.4', 'Password change with a wrong current password is rejected (401)', res.status === 401, `status ${res.status}`);
    res = await a.call('PUT', '/api/auth/password', { currentPassword: 'secret123', newPassword: 'newsecret1' });
    const relogin = await newClient().call('POST', '/api/auth/login', { email: emailA, password: 'newsecret1' });
    const oldLogin = await newClient().call('POST', '/api/auth/login', { email: emailA, password: 'secret123' });
    check('FR-7.3', 'Password change with the right current password; the new one works and the old one does not',
        res.status === 200 && relogin.status === 200 && oldLogin.status === 401, `change ${res.status}, new login ${relogin.status}, old login ${oldLogin.status}`);

    // NFR-3.3 / NFR-7.2 isolation between users
    await b.call('POST', '/api/budget', { amount: 900 });
    const bList = await b.call('GET', '/api/expenses');
    check('NFR-3.3', 'A user only sees their own expenses', bList.status === 200 && bList.data.length === 0, `user B sees ${bList.data && bList.data.length}`);
    const bEdit = await b.call('PUT', `/api/expenses/${rentId}`, { name: 'hacked', amount: 1, category: 'Other', date: today });
    const bDelete = await b.call('DELETE', `/api/expenses/${rentId}`);
    const stillThere = (await a.call('GET', '/api/expenses')).data.find(e => e._id === rentId);
    check('NFR-3.3', 'A user cannot edit or delete another user\'s expense (404) and it stays unchanged',
        bEdit.status === 404 && bDelete.status === 404 && stillThere && stillThere.name === 'Rent (edited)', `edit ${bEdit.status}, delete ${bDelete.status}`);
    check('NFR-3.3', 'Each user has their own budget', (await a.call('GET', '/api/budget')).data.amount === 25000 && (await b.call('GET', '/api/budget')).data.amount === 900, 'budgets mixed up');
    const leak = JSON.stringify([bEdit.data, bDelete.data, (await b.call('GET', '/api/expenses?month=' + thisMonth)).data]);
    check('NFR-7.2', 'Error replies never contain another user\'s data', !/Rent|Groceries|Headphones|6500/.test(leak), 'another user\'s data appeared in a reply');
    const forged = await a.call('POST', '/api/expenses', { name: 'forged', amount: 5, category: 'Other', date: today, userId: '000000000000000000000001' });
    const forgedSeen = (await a.call('GET', '/api/expenses')).data.some(e => e.name === 'forged');
    check('NFR-3.3', 'The owner of a record comes from the session, not from the request body', forged.status === 201 && forgedSeen, 'the expense was saved under another id');
    await a.call('DELETE', `/api/expenses/${forged.data._id}`);

    // NFR-1.1 speed (median of 3 reads)
    const listTimes = [];
    const budgetTimes = [];
    for (let i = 0; i < 3; i++) {
        listTimes.push((await a.call('GET', `/api/expenses?month=${thisMonth}`)).ms);
        budgetTimes.push((await a.call('GET', '/api/budget')).ms);
    }
    const slowest = Math.max(median(listTimes), median(budgetTimes));
    check('NFR-1.1', 'Expense list and budget are returned within 2 seconds', slowest <= 2000,
        `median ${median(listTimes)} ms (list), ${median(budgetTimes)} ms (budget); a slow network to the database makes this fail`);
    manual('NFR-1.2', 'Charts render within 3 seconds of the data loading', 'measured in the browser test');

    // NFR-6.1 new categories
    res = await a.call('POST', '/api/expenses', { name: 'Dog food', amount: 300, category: 'Pets', date: today });
    check('NFR-6.1', 'A new category and many records need no schema change', res.status === 201 && res.data.category === 'Pets', `status ${res.status}`);

    // FR-2.5 clear all + FR-7 account deletion (spec 3.5)
    res = await a.call('DELETE', '/api/expenses');
    const emptied = await a.call('GET', '/api/expenses');
    check('FR-2.5', 'Clear all removes all of the user\'s expenses', res.status === 200 && emptied.data.length === 0, `status ${res.status}, left ${emptied.data && emptied.data.length}`);
    await a.call('POST', '/api/expenses', { name: 'To be deleted with the account', amount: 1, category: 'Other', date: today });
    const secondSession = newClient();
    await secondSession.call('POST', '/api/auth/login', { email: emailA, password: 'newsecret1' });
    res = await a.call('DELETE', '/api/auth/account', { password: 'wrong-pass' });
    check('SRS 3.5', 'Account deletion needs the right password (401 otherwise)', res.status === 401, `status ${res.status}`);
    res = await a.call('DELETE', '/api/auth/account', { password: 'newsecret1' });
    const afterLogin = await newClient().call('POST', '/api/auth/login', { email: emailA, password: 'newsecret1' });
    const staleSession = await secondSession.call('POST', '/api/expenses', { name: 'ghost', amount: 1, category: 'Other', date: today });
    check('SRS 3.5', 'The account can be deleted; it can no longer log in and other sessions stop working',
        res.status === 200 && afterLogin.status === 401 && staleSession.status === 401, `delete ${res.status}, login ${afterLogin.status}, old session ${staleSession.status}`);
    manual('SRS 3.5', 'All the account\'s expenses and budget are removed from the database', 'checked directly in the database by the test suite (see README)');

    // Requirements that are about how the system is built
    if (IS_LOCAL) {
        const routes = ['auth', 'expenses', 'ai', 'stream'].map(n => path.join(__dirname, '..', 'server', 'routes', `${n}.js`));
        check('NFR-5.2', 'Backend has separate route modules (auth, expenses, AI)', routes.every(f => fs.existsSync(f)), 'a route file is missing');
    } else {
        skip('NFR-5.2', 'Backend has separate route modules', 'needs the source files; run the script locally');
    }
    if (IS_HTTPS) pass('NFR-3.4', 'All traffic uses HTTPS'); else skip('NFR-3.4', 'All traffic uses HTTPS', 'testing over plain HTTP locally; Vercel serves the live site over HTTPS');
    manual('NFR-3.1', 'Passwords are stored as salted bcrypt hashes', 'checked directly in the database (cost 12), and no hash is ever returned (FR-1.3 above)');
    manual('NFR-4.1', 'A first-time user can log an expense in under 30 seconds', 'timed in the browser test');
    manual('NFR-4.2', 'Usable on desktop and mobile widths', 'checked in the browser test at 320, 390 and 768 px');
    manual('NFR-5.3', 'Deployable on any Node.js serverless or cloud host', 'configuration only: vercel.json and environment variables');
    manual('NFR-8.1', 'Data is handled in line with data-protection practice', 'a design review item (hashing, httpOnly cookie, per-user filtering, delete account)');

    // Clean up user B (user A deleted its account above)
    await b.call('DELETE', '/api/auth/account', { password: 'secret123' });
}

// ─── Run it and print the table ───────────────────────────────────────────────

(async () => {
    console.log(`Smoke test against ${BASE_URL}\n`);
    try {
        await run();
    } catch (err) {
        fail('RUN', 'The test run itself', err.message);
    }

    const symbol = { PASS: 'PASS  ', FAIL: 'FAIL  ', SKIP: 'SKIP  ', MANUAL: 'MANUAL' };
    for (const r of results) {
        console.log(`${symbol[r.status]} ${r.id.padEnd(8)} ${r.text}${r.note ? '\n' + ' '.repeat(16) + '-> ' + r.note : ''}`);
    }

    const count = status => results.filter(r => r.status === status).length;
    console.log(`\n${count('PASS')} passed, ${count('FAIL')} failed, ${count('SKIP')} skipped, ${count('MANUAL')} manual`);
    process.exit(count('FAIL') > 0 ? 1 : 0);
})();
