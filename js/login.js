// Login page: the Login and Register forms.

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

        // Logged in: go to the dashboard
        window.location.replace('dashboard.html');

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

        // Account created and logged in: go to the dashboard
        window.location.replace('dashboard.html');

    } catch (err) {
        errorEl.textContent = 'Registration failed. Please try again.';
        errorEl.classList.remove('hidden');
    } finally {
        btn.classList.remove('loading');
    }
}

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
}

// If the user is already logged in, skip this page (Design 5.1)
async function initLogin() {
    setupAuthTabs();

    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) window.location.replace('dashboard.html');
    } catch (err) {
        // server not reachable: just show the login form
    }
}

initLogin();
