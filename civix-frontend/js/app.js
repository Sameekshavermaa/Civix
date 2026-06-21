/* ============================================================
   Civix – Main App Controller
   ============================================================ */

const App = (() => {
    let currentUser = null;
    let societyId   = CivixConfig.DEFAULT_SOCIETY_ID;

    function init() {
        if (!requireAuth()) return;
        currentUser = Auth.getUser();
        if (!currentUser) { Auth.logout(true); return; }
        societyId = currentUser.societyId || CivixConfig.DEFAULT_SOCIETY_ID;

        renderSidebar();
        bindSidebarToggle();
        bindLogout();
        loadDashboard();
        navigateTo('page-dashboard', 'Dashboard');
    }

    // ── Sidebar build ────────────────────────────────────────
    function renderSidebar() {
        const isAdmin    = Auth.isAdmin();
        const initials   = (currentUser.fullName || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        const roleLabel  = isAdmin ? 'Admin' : 'Resident';
        const roleClass  = isAdmin ? 'admin' : 'resident';

        document.getElementById('userAvatar').textContent  = initials;
        document.getElementById('userName').textContent    = currentUser.fullName || currentUser.username;
        document.getElementById('userRoleBadge').textContent = roleLabel;
        document.getElementById('userRoleBadge').className  = `user-role ${roleClass}`;

        const nav = document.getElementById('sidebarNav');
        const adminItems = isAdmin ? `
            <button class="nav-item" data-page="page-residents"   onclick="navigateTo('page-residents','Residents'); loadResidents()">
                <i class="fa-solid fa-users"></i> Residents
            </button>
            <button class="nav-item" data-page="page-complaints"  onclick="navigateTo('page-complaints','Complaints'); loadComplaints()">
                <i class="fa-solid fa-file-circle-exclamation"></i> Complaints
            </button>
            <button class="nav-item" data-page="page-notices"     onclick="navigateTo('page-notices','Notices'); loadNotices()">
                <i class="fa-solid fa-bullhorn"></i> Notices
            </button>
            <button class="nav-item" data-page="page-maintenance" onclick="navigateTo('page-maintenance','Maintenance'); loadMaintenance()">
                <i class="fa-solid fa-wrench"></i> Maintenance
            </button>
            <button class="nav-item" data-page="page-reports"     onclick="navigateTo('page-reports','Reports'); loadReports()">
                <i class="fa-solid fa-chart-bar"></i> Reports
            </button>
        ` : `
            <button class="nav-item" data-page="page-my-complaints" onclick="navigateTo('page-my-complaints','My Complaints'); loadMyComplaints()">
                <i class="fa-solid fa-file-circle-exclamation"></i> My Complaints
            </button>
            <button class="nav-item" data-page="page-notices"       onclick="navigateTo('page-notices','Notices'); loadNotices()">
                <i class="fa-solid fa-bullhorn"></i> Notices
            </button>
            <button class="nav-item" data-page="page-my-maintenance" onclick="navigateTo('page-my-maintenance','Maintenance Dues'); loadMyMaintenance()">
                <i class="fa-solid fa-receipt"></i> Maintenance
            </button>
            <button class="nav-item" data-page="page-profile"       onclick="navigateTo('page-profile','My Profile'); loadProfile()">
                <i class="fa-solid fa-circle-user"></i> My Profile
            </button>
        `;

        nav.innerHTML = `
            <p class="nav-section-label">Main Menu</p>
            <button class="nav-item active" data-page="page-dashboard" onclick="navigateTo('page-dashboard','Dashboard'); loadDashboard()">
                <i class="fa-solid fa-gauge-high"></i> Dashboard
            </button>
            ${adminItems}
        `;
    }

    function bindSidebarToggle() {
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            const sb = document.getElementById('sidebar');
            if (window.innerWidth >= 1024) {
                sb.classList.toggle('collapsed');
                document.getElementById('mainContent').classList.toggle('expanded');
            } else {
                sb.classList.toggle('open');
            }
        });
    }

    function bindLogout() {
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            if (confirmAction('Are you sure you want to log out?')) Auth.logout();
        });
    }

    // ── Dashboard ────────────────────────────────────────────
    async function loadDashboard() {
        showLoading('dashboardStats', 'Loading dashboard...');
        try {
            const res = Auth.isAdmin()
                ? await Api.dashboard.admin(societyId)
                : await Api.dashboard.resident();

            if (res && res.success) renderDashboard(res.data);
            else showEmpty('dashboardStats', 'fa-exclamation-circle', 'Could not load', 'Failed to load dashboard data.');
        } catch { showEmpty('dashboardStats', 'fa-wifi-slash', 'Connection Error', 'Could not reach the server.'); }
    }

    function renderDashboard(d) {
        const isAdmin = Auth.isAdmin();
        document.getElementById('dashboardStats').innerHTML = `
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fa-solid fa-users"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${d.totalResidents}</div>
                    <div class="stat-label">Total Residents</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><i class="fa-solid fa-circle-exclamation"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${d.openComplaints}</div>
                    <div class="stat-label">Open Complaints</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><i class="fa-solid fa-clock-rotate-left"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${d.inProgressComplaints}</div>
                    <div class="stat-label">In Progress</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fa-solid fa-circle-check"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${d.resolvedComplaints}</div>
                    <div class="stat-label">Resolved</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple"><i class="fa-solid fa-bullhorn"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${d.activeNotices}</div>
                    <div class="stat-label">Active Notices</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${d.pendingMaintenance}</div>
                    <div class="stat-label">Pending Dues</div>
                </div>
            </div>
            ${isAdmin ? `
            <div class="stat-card">
                <div class="stat-icon green"><i class="fa-solid fa-indian-rupee-sign"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${formatCurrency(d.monthlyCollections)}</div>
                    <div class="stat-label">Monthly Collections</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><i class="fa-solid fa-file-invoice-dollar"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${formatCurrency(d.pendingAmount)}</div>
                    <div class="stat-label">Pending Amount</div>
                </div>
            </div>` : ''}
        `;

        // Load recent data panels
        loadRecentComplaints();
        loadRecentNotices();
    }

    async function loadRecentComplaints() {
        try {
            const res = Auth.isAdmin()
                ? await Api.complaints.society(societyId)
                : await Api.complaints.my();
            if (!res || !res.success) return;
            const items = res.data.slice(0, 5);
            const tbody = document.getElementById('recentComplaintsBody');
            if (!tbody) return;
            if (!items.length) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center"><div class="empty-state" style="padding:24px"><div class="empty-icon"><i class="fa-solid fa-face-smile"></i></div><p>No complaints yet</p></div></td></tr>`;
                return;
            }
            tbody.innerHTML = items.map(c => `
                <tr>
                    <td><span class="font-bold text-sm">${escHtml(c.complaintNo)}</span></td>
                    <td>${escHtml(c.title)}</td>
                    <td>${statusBadge(c.status)}</td>
                    <td>${statusBadge(c.priority)}</td>
                    <td class="text-muted text-sm">${timeAgo(c.createdAt)}</td>
                </tr>`).join('');
        } catch {}
    }

    async function loadRecentNotices() {
        try {
            const res = await Api.notices.active(societyId);
            if (!res || !res.success) return;
            const items = res.data.slice(0, 4);
            const container = document.getElementById('recentNoticesContainer');
            if (!container) return;
            if (!items.length) {
                container.innerHTML = '<p class="text-muted">No active notices.</p>'; return;
            }
            container.innerHTML = items.map(n => `
                <div class="notice-card ${n.noticeType === 'URGENT' ? 'urgent' : ''} ${n.isPinned ? 'pinned' : ''}" style="padding:14px 16px; margin-bottom:10px">
                    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
                        ${n.isPinned ? '<i class="fa-solid fa-thumbtack" style="color:var(--primary);font-size:.8rem"></i>' : ''}
                        <span class="font-bold" style="font-size:.92rem">${escHtml(n.title)}</span>
                        ${statusBadge(n.noticeType)}
                    </div>
                    <p class="text-muted text-sm">${timeAgo(n.publishDate)}</p>
                </div>`).join('');
        } catch {}
    }

    return { init, loadDashboard, societyId: () => societyId, user: () => currentUser };
})();

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', App.init);
