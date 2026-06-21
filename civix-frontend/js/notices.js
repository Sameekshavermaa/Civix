/* ============================================================
   Civix – Notices Module
   ============================================================ */

let _allNotices = [];

async function loadNotices() {
    showLoading('noticesContainer', 'Loading notices...');
    try {
        const res = Auth.isAdmin()
            ? await Api.notices.all(App.societyId())
            : await Api.notices.active(App.societyId());
        if (res && res.success) {
            _allNotices = res.data;
            renderNotices(_allNotices);
        } else {
            showEmpty('noticesContainer', 'fa-bullhorn', 'No Notices', 'No notices available.');
        }
    } catch { Toast.error('Failed to load notices.'); }
}

function renderNotices(list) {
    const container = document.getElementById('noticesContainer');
    if (!container) return;
    if (!list.length) {
        showEmpty('noticesContainer', 'fa-bullhorn', 'No Notices', 'No notices to display right now.');
        return;
    }
    container.innerHTML = list.map(n => buildNoticeCard(n)).join('');
}

function buildNoticeCard(n) {
    const isAdmin  = Auth.isAdmin();
    const pinIcon  = n.isPinned ? `<i class="fa-solid fa-thumbtack" title="Pinned" style="color:var(--primary)"></i>` : '';
    const unpubTag = (!n.isPublished && isAdmin) ? `<span class="badge badge-closed">Draft</span>` : '';

    return `
    <div class="notice-card ${n.noticeType === 'URGENT' ? 'urgent' : ''} ${n.isPinned ? 'pinned' : ''}" id="notice-${n.id}">
        <div class="notice-card-header">
            <div style="flex:1">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                    ${pinIcon}
                    <span class="notice-card-title">${escHtml(n.title)}</span>
                    ${statusBadge(n.noticeType)}
                    ${unpubTag}
                </div>
                <div class="notice-card-meta">
                    <span><i class="fa-solid fa-user"></i>${escHtml(n.createdByName)}</span>
                    <span><i class="fa-regular fa-clock"></i>${timeAgo(n.publishDate)}</span>
                    ${n.expiryDate ? `<span><i class="fa-solid fa-calendar-xmark"></i>Expires ${formatDate(n.expiryDate)}</span>` : ''}
                    <span><i class="fa-solid fa-eye"></i>${n.viewCount} views</span>
                </div>
            </div>
            ${isAdmin ? `
            <div style="display:flex;gap:6px;flex-shrink:0">
                <button class="btn btn-sm ${n.isPublished ? 'btn-warning' : 'btn-success'}" onclick="toggleNoticePublish(${n.id})" title="${n.isPublished ? 'Unpublish' : 'Publish'}">
                    <i class="fa-solid fa-${n.isPublished ? 'eye-slash' : 'eye'}"></i>
                </button>
                <button class="btn btn-sm btn-secondary" onclick="openEditNotice(${n.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-danger"    onclick="deleteNotice(${n.id})"><i class="fa-solid fa-trash"></i></button>
            </div>` : ''}
        </div>
        <div class="notice-card-body">${escHtml(n.content)}</div>
    </div>`;
}

function filterNotices() {
    const search = (document.getElementById('searchNotice')?.value || '').toLowerCase();
    const type   = document.getElementById('filterNoticeType')?.value || '';
    const filtered = _allNotices.filter(n =>
        (!search || n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search)) &&
        (!type   || n.noticeType === type)
    );
    renderNotices(filtered);
}

function openCreateNotice() {
    document.getElementById('noticeModalTitle').textContent = 'Create Notice';
    document.getElementById('noticeForm').reset();
    document.getElementById('noticeId').value = '';
    document.getElementById('noticePublishDate').value = new Date().toISOString().slice(0,16);
    openModal('noticeModal');
}

function openEditNotice(id) {
    const n = _allNotices.find(x => x.id === id);
    if (!n) return;
    document.getElementById('noticeModalTitle').textContent = 'Edit Notice';
    document.getElementById('noticeId').value          = n.id;
    document.getElementById('noticeTitle').value       = n.title;
    document.getElementById('noticeContent').value     = n.content;
    document.getElementById('noticeType').value        = n.noticeType;
    document.getElementById('noticePinned').checked    = n.isPinned;
    document.getElementById('noticePublished').checked = n.isPublished;
    document.getElementById('noticePublishDate').value = n.publishDate ? n.publishDate.replace(' ', 'T').slice(0,16) : '';
    document.getElementById('noticeExpiryDate').value  = n.expiryDate  ? n.expiryDate.replace(' ', 'T').slice(0,16)  : '';
    openModal('noticeModal');
}

async function submitNoticeForm(e) {
    e.preventDefault();
    const id = document.getElementById('noticeId').value;
    const payload = {
        title:       document.getElementById('noticeTitle').value.trim(),
        content:     document.getElementById('noticeContent').value.trim(),
        noticeType:  document.getElementById('noticeType').value,
        isPinned:    document.getElementById('noticePinned').checked,
        isPublished: document.getElementById('noticePublished').checked,
        publishDate: document.getElementById('noticePublishDate').value || null,
        expiryDate:  document.getElementById('noticeExpiryDate').value  || null
    };
    if (!payload.title || !payload.content) { Toast.warning('Title and content are required.'); return; }

    const btn = document.getElementById('saveNoticeBtn');
    btn.disabled = true;
    try {
        const res = id
            ? await Api.notices.update(id, payload)
            : await Api.notices.create(App.societyId(), payload);
        if (res && res.success) {
            Toast.success(id ? 'Notice updated.' : 'Notice created.');
            closeModal('noticeModal');
            loadNotices();
        } else { Toast.error(res?.error || 'Save failed.'); }
    } catch { Toast.error('Error saving notice.'); }
    finally { btn.disabled = false; }
}

async function toggleNoticePublish(id) {
    try {
        const res = await Api.notices.publish(id);
        if (res && res.success) {
            const n = _allNotices.find(x => x.id === id);
            if (n) n.isPublished = res.data.isPublished;
            Toast.success(res.data.isPublished ? 'Notice published.' : 'Notice unpublished.');
            loadNotices();
        } else { Toast.error(res?.error || 'Action failed.'); }
    } catch { Toast.error('Error toggling publish status.'); }
}

async function deleteNotice(id) {
    if (!confirmAction('Are you sure you want to delete this notice?')) return;
    try {
        const res = await Api.notices.delete(id);
        if (res && res.success) {
            Toast.success('Notice deleted.');
            loadNotices();
        } else { Toast.error(res?.error || 'Delete failed.'); }
    } catch { Toast.error('Error deleting notice.'); }
}
