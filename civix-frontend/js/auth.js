/* ============================================================
   Civix – Auth Page Logic
   ============================================================ */

const Auth = (() => {
    function getUser()  { try { return JSON.parse(localStorage.getItem(CivixConfig.USER_KEY)); } catch { return null; } }
    function isLoggedIn(){ return !!localStorage.getItem(CivixConfig.TOKEN_KEY); }
    function isAdmin()  { const u = getUser(); return u && u.roles && u.roles.includes('ROLE_ADMIN'); }
    function isResident(){ const u = getUser(); return u && u.roles && u.roles.includes('ROLE_RESIDENT'); }

    function saveSession(data) {
        localStorage.setItem(CivixConfig.TOKEN_KEY,   data.accessToken);
        localStorage.setItem(CivixConfig.REFRESH_KEY, data.refreshToken);
        localStorage.setItem(CivixConfig.USER_KEY,    JSON.stringify(data));
    }

    function logout(silent = false) {
        if (!silent) { Api.auth.logout().catch(() => {}); }
        localStorage.removeItem(CivixConfig.TOKEN_KEY);
        localStorage.removeItem(CivixConfig.REFRESH_KEY);
        localStorage.removeItem(CivixConfig.USER_KEY);
        window.location.href = 'index.html';
    }

    return { getUser, isLoggedIn, isAdmin, isResident, saveSession, logout };
})();

// ── Redirect if already logged in ───────────────────────────
if (Auth.isLoggedIn()) { window.location.href = 'dashboard.html'; }

// ── Tab switching ─────────────────────────────────────────────
function switchTab(tab) {
    document.getElementById('loginForm').classList.toggle('hidden',    tab !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
    document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

// ── Password toggle ───────────────────────────────────────────
function togglePassword(inputId, btn) {
    const inp = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (inp.type === 'password') {
        inp.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
    } else {
        inp.type = 'password';
        icon.className = 'fa-solid fa-eye';
    }
}

// ── Demo credentials ──────────────────────────────────────────
function fillCreds(username, password) {
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
}

// ── Login ─────────────────────────────────────────────────────
async function handleLogin(e) {
    e.preventDefault();
    const errEl  = document.getElementById('loginError');
    const btn    = document.getElementById('loginBtn');
    const usernameOrEmail = document.getElementById('loginUsername').value.trim();
    const password        = document.getElementById('loginPassword').value;

    errEl.classList.add('hidden');
    setButtonLoading(btn, true);

    try {
        const res = await Api.auth.login({ usernameOrEmail, password });
        if (res && res.success && res.data) {
            Auth.saveSession(res.data);
            window.location.href = 'dashboard.html';
        } else {
            showError(errEl, res?.error || 'Invalid credentials. Please try again.');
        }
    } catch (err) {
        showError(errEl, 'Unable to connect to server. Please check your connection.');
    } finally {
        setButtonLoading(btn, false);
    }
}

// ── Register ──────────────────────────────────────────────────
async function handleRegister(e) {
    e.preventDefault();
    const errEl = document.getElementById('registerError');
    const btn   = document.getElementById('registerBtn');
    errEl.classList.add('hidden');

    const data = {
        fullName:  document.getElementById('regFullName').value.trim(),
        username:  document.getElementById('regUsername').value.trim(),
        email:     document.getElementById('regEmail').value.trim(),
        phone:     document.getElementById('regPhone').value.trim(),
        password:  document.getElementById('regPassword').value,
        unitNumber:document.getElementById('regUnit').value.trim()
    };

    if (!data.fullName || !data.username || !data.email || !data.phone || !data.password) {
        showError(errEl, 'All fields are required.'); return;
    }
    if (!/^[0-9]{10}$/.test(data.phone)) {
        showError(errEl, 'Phone must be exactly 10 digits.'); return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(data.password)) {
        showError(errEl, 'Password must be 8+ chars with uppercase, lowercase and digit.'); return;
    }

    setButtonLoading(btn, true);
    try {
        const res = await Api.auth.register(data);
        if (res && res.success && res.data) {
            Auth.saveSession(res.data);
            window.location.href = 'dashboard.html';
        } else {
            const msg = res?.error || (typeof res?.data === 'object' ? Object.values(res.data).join(', ') : 'Registration failed.');
            showError(errEl, msg);
        }
    } catch (err) {
        showError(errEl, 'Unable to connect to server. Please check your connection.');
    } finally {
        setButtonLoading(btn, false);
    }
}

// ── Helpers ───────────────────────────────────────────────────
function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
}

function setButtonLoading(btn, loading) {
    btn.disabled = loading;
    btn.querySelector('.btn-text').classList.toggle('hidden', loading);
    btn.querySelector('.btn-spinner').classList.toggle('hidden', !loading);
}
