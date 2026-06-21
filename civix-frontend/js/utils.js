/* ============================================================
   Civix – Shared Utilities
   ============================================================ */

// ── Toast Notifications ───────────────────────────────────────
const Toast = (() => {
    let container = null;

    function getContainer() {
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    function show(message, type = 'info', duration = 3500) {
        const c = getContainer();
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${icons[type]} toast-icon"></i>
            <span class="toast-msg">${message}</span>
        `;
        c.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
    }

    return {
        success: (msg, dur) => show(msg, 'success', dur),
        error:   (msg, dur) => show(msg, 'error',   dur),
        warning: (msg, dur) => show(msg, 'warning', dur),
        info:    (msg, dur) => show(msg, 'info',    dur),
    };
})();

// ── Modal Helpers ─────────────────────────────────────────────
function openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}
// Close modal on overlay click
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
        document.body.style.overflow = '';
    }
});

// ── Date Formatters ───────────────────────────────────────────
function formatDate(str) {
    if (!str) return '—';
    try {
        const d = new Date(str);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return str; }
}
function formatDateTime(str) {
    if (!str) return '—';
    try {
        const d = new Date(str);
        return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return str; }
}
function timeAgo(str) {
    if (!str) return '';
    const diff = Date.now() - new Date(str).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return formatDate(str);
}

// ── Currency Formatter ────────────────────────────────────────
function formatCurrency(amount) {
    if (amount == null) return '₹0';
    return '₹' + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Badge Renderer ────────────────────────────────────────────
function statusBadge(status) {
    if (!status) return '';
    const cls = status.toLowerCase().replace(/_/g, '_');
    return `<span class="badge badge-${cls}">${status.replace(/_/g, ' ')}</span>`;
}

// ── Escape HTML ───────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Loading Spinner ───────────────────────────────────────────
function showLoading(containerId, text = 'Loading...') {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-spinner fa-spin"></i></div><p>${text}</p></div>`;
}

// ── Empty State ───────────────────────────────────────────────
function showEmpty(containerId, icon, title, msg) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fa-solid ${icon}"></i></div><h3>${title}</h3><p>${msg}</p></div>`;
}

// ── Confirm Dialog ─────────────────────────────────────────────
function confirmAction(msg) { return window.confirm(msg); }

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, delay) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ── Input File Preview ────────────────────────────────────────
function setupFileUpload(areaId, inputId, listId, maxFiles = 5) {
    const area  = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);
    if (!area || !input || !list) return;

    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
    area.addEventListener('dragleave', () => area.classList.remove('dragover'));
    area.addEventListener('drop', e => {
        e.preventDefault(); area.classList.remove('dragover');
        addFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', () => addFiles(input.files));

    function addFiles(files) {
        const existing = list.querySelectorAll('.file-item').length;
        const allowed  = ['image/jpeg','image/png','image/gif','application/pdf'];
        let added = 0;
        for (const f of files) {
            if (existing + added >= maxFiles) { Toast.warning(`Max ${maxFiles} files allowed.`); break; }
            if (!allowed.includes(f.type))    { Toast.warning(`"${f.name}" is not an allowed file type.`); continue; }
            if (f.size > 10 * 1024 * 1024)   { Toast.warning(`"${f.name}" exceeds 10MB.`); continue; }
            const item = document.createElement('div');
            item.className = 'file-item';
            item.dataset.fileName = f.name;
            item.innerHTML = `<i class="fa-solid fa-file-image"></i><span class="file-name">${escHtml(f.name)}</span><span class="text-muted text-sm">${(f.size/1024).toFixed(1)}KB</span><button type="button" class="file-remove" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>`;
            list.appendChild(item);
            added++;
        }
    }
}

// ── Sidebar nav highlight & page switching ────────────────────
function navigateTo(pageId, label) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    const navItem = document.querySelector(`[data-page="${pageId}"]`);
    if (navItem) navItem.classList.add('active');
    const titleEl = document.getElementById('topbarTitle');
    if (titleEl && label) titleEl.textContent = label;
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
        document.getElementById('sidebar')?.classList.remove('open');
    }
    window.scrollTo(0, 0);
}

// ── Session guard ─────────────────────────────────────────────
function requireAuth() {
    if (!localStorage.getItem(CivixConfig.TOKEN_KEY)) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}
