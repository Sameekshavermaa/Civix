/* ============================================================
   Civix – Complaints Module
   ============================================================ */

let _allComplaints = [];
let _categories    = [];

async function loadComplaints() {
    showLoading('complaintsTableBody', 'Loading complaints...');
    try {
        const [catRes, cmpRes] = await Promise.all([
            Api.complaints.categories(),
            Auth.isAdmin()
                ? Api.complaints.society(App.societyId())
                : Api.complaints.my()
        ]);
        if (catRes && catRes.data) _categories = catRes.data;
        if (cmpRes && cmpRes.success) {
            _allComplaints = cmpRes.data;
            renderComplaintsTable(_allComplaints);
            populateCategoryFilter();
        }
    } catch { Toast.error('Failed to load complaints.'); }
}

async function loadMyComplaints() {
    showLoading('myComplaintsTableBody', 'Loading complaints...');
    try {
        const [catRes, cmpRes] = await Promise.all([
            Api.complaints.categories(),
            Api.complaints.my()
        ]);
        if (catRes && catRes.data) _categories = catRes.data;
        if (cmpRes && cmpRes.success) {
            _allComplaints = cmpRes.data;
            renderMyComplaintsTable(_allComplaints);
            populateMyCategoryFilter();
            populateComplaintCategorySelect('newComplaintCategory');
        }
    } catch { Toast.error('Failed to load complaints.'); }
}

function renderComplaintsTable(list) {
    const tbody = document.getElementById('complaintsTableBody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="padding:40px"><div class="empty-icon"><i class="fa-solid fa-inbox"></i></div><h3>No Complaints</h3><p>No complaints found matching your filters.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(c => `
        <tr>
            <td><span class="font-bold" style="font-size:.8rem;color:var(--primary)">${escHtml(c.complaintNo)}</span></td>
            <td>
                <div class="font-bold" style="font-size:.88rem">${escHtml(c.title)}</div>
                <div class="text-muted text-sm">${escHtml(c.residentName)} · ${escHtml(c.residentUnit)}</div>
            </td>
            <td>${escHtml(c.categoryName || '—')}</td>
            <td>${statusBadge(c.status)}</td>
            <td>${statusBadge(c.priority)}</td>
            <td>
                ${c.aiCategory ? `<div class="ai-badge"><i class="fa-solid fa-robot"></i>${escHtml(c.aiCategory)}</div>` : '<span class="text-muted">—</span>'}
            </td>
            <td class="text-muted text-sm">${timeAgo(c.createdAt)}</td>
            <td>
                <div style="display:flex;gap:6px">
                    <button class="btn btn-sm btn-secondary" onclick="viewComplaint(${c.id})"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn btn-sm btn-primary"   onclick="openUpdateComplaint(${c.id})"><i class="fa-solid fa-pen"></i></button>
                </div>
            </td>
        </tr>`).join('');
}

function renderMyComplaintsTable(list) {
    const tbody = document.getElementById('myComplaintsTableBody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:40px"><div class="empty-icon"><i class="fa-solid fa-inbox"></i></div><h3>No Complaints Yet</h3><p>Submit your first complaint using the button above.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(c => `
        <tr>
            <td><span class="font-bold" style="font-size:.8rem;color:var(--primary)">${escHtml(c.complaintNo)}</span></td>
            <td>
                <div class="font-bold" style="font-size:.88rem">${escHtml(c.title)}</div>
                <div class="text-muted text-sm">${escHtml(c.categoryName || 'General')}</div>
            </td>
            <td>${statusBadge(c.status)}</td>
            <td>${statusBadge(c.priority)}</td>
            <td>${c.aiCategory ? `<div class="ai-badge"><i class="fa-solid fa-robot"></i>${escHtml(c.aiCategory)}</div>` : '<span class="text-muted">—</span>'}</td>
            <td class="text-muted text-sm">${timeAgo(c.createdAt)}</td>
        </tr>`).join('');
}

function populateCategoryFilter() {
    const sel = document.getElementById('filterCategory');
    if (!sel) return;
    sel.innerHTML = `<option value="">All Categories</option>` +
        _categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

function populateMyCategoryFilter() {
    const sel = document.getElementById('myFilterCategory');
    if (!sel) return;
    sel.innerHTML = `<option value="">All Categories</option>` +
        _categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

function populateComplaintCategorySelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = `<option value="">Select category</option>` +
        _categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function filterComplaints() {
    const search   = (document.getElementById('searchComplaint')?.value || '').toLowerCase();
    const status   = document.getElementById('filterStatus')?.value   || '';
    const category = document.getElementById('filterCategory')?.value || '';
    const filtered = _allComplaints.filter(c =>
        (!search   || c.title.toLowerCase().includes(search) || c.complaintNo.toLowerCase().includes(search) || (c.residentName||'').toLowerCase().includes(search)) &&
        (!status   || c.status === status) &&
        (!category || c.categoryName === category)
    );
    Auth.isAdmin() ? renderComplaintsTable(filtered) : renderMyComplaintsTable(filtered);
}

async function viewComplaint(id) {
    try {
        const res = await Api.complaints.get(id);
        if (!res || !res.success) { Toast.error('Could not load complaint.'); return; }
        const c = res.data;
        document.getElementById('viewComplaintContent').innerHTML = `
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px">
                <span class="font-bold" style="font-size:1rem">${escHtml(c.complaintNo)}</span>
                ${statusBadge(c.status)} ${statusBadge(c.priority)}
                ${c.aiCategory ? `<div class="ai-badge"><i class="fa-solid fa-robot"></i>${escHtml(c.aiCategory)} (${c.aiConfidence ? Math.round(c.aiConfidence*100) : '—'}% confidence)</div>` : ''}
            </div>
            <h3 style="font-size:1.05rem;margin-bottom:8px">${escHtml(c.title)}</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:.85rem">
                <div><span class="text-muted">Resident:</span> ${escHtml(c.residentName)}</div>
                <div><span class="text-muted">Unit:</span> ${escHtml(c.residentUnit)}</div>
                <div><span class="text-muted">Category:</span> ${escHtml(c.categoryName || '—')}</div>
                <div><span class="text-muted">Assigned To:</span> ${escHtml(c.assignedToName || '—')}</div>
                <div><span class="text-muted">Submitted:</span> ${formatDateTime(c.createdAt)}</div>
                <div><span class="text-muted">Resolved:</span> ${c.resolvedAt ? formatDateTime(c.resolvedAt) : '—'}</div>
            </div>
            <div style="margin-bottom:16px">
                <p class="form-label">Description</p>
                <div style="background:var(--bg);padding:12px;border-radius:var(--radius-sm);font-size:.88rem;white-space:pre-wrap;color:var(--text-secondary)">${escHtml(c.description)}</div>
            </div>
            ${c.resolutionComment ? `<div style="margin-bottom:16px"><p class="form-label">Resolution</p><div style="background:var(--success-light);padding:12px;border-radius:var(--radius-sm);font-size:.88rem;color:var(--success)">${escHtml(c.resolutionComment)}</div></div>` : ''}
            ${(c.attachments||[]).length ? `
            <div style="margin-bottom:16px">
                <p class="form-label">Attachments (${c.attachments.length})</p>
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                    ${c.attachments.map(a => `<div style="padding:6px 12px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.8rem;display:flex;gap:6px;align-items:center"><i class="fa-solid fa-file"></i>${escHtml(a.fileName)}</div>`).join('')}
                </div>
            </div>` : ''}
            <div>
                <p class="form-label">Status History</p>
                <div class="timeline">
                    ${(c.statusHistory||[]).map(h => `
                    <div class="timeline-item">
                        <div class="timeline-dot"><i class="fa-solid fa-circle-dot"></i></div>
                        <div class="timeline-content">
                            <div class="timeline-title">${h.oldStatus ? escHtml(h.oldStatus)+' → ' : ''}${statusBadge(h.newStatus)}</div>
                            <div class="timeline-meta">By ${escHtml(h.changedByName)} · ${timeAgo(h.changedAt)}</div>
                            ${h.comment ? `<div class="timeline-comment">${escHtml(h.comment)}</div>` : ''}
                        </div>
                    </div>`).join('')}
                </div>
            </div>`;
        openModal('viewComplaintModal');
    } catch { Toast.error('Error loading complaint details.'); }
}

async function openUpdateComplaint(id) {
    const c = _allComplaints.find(x => x.id === id);
    if (!c) return;
    document.getElementById('updateComplaintId').value      = id;
    document.getElementById('updateComplaintNo').textContent = c.complaintNo;
    document.getElementById('updateStatus').value            = c.status;
    document.getElementById('updatePriority').value          = c.priority;
    document.getElementById('updateComment').value           = '';
    document.getElementById('updateResolution').value        = c.resolutionComment || '';
    openModal('updateComplaintModal');
}

async function submitUpdateComplaint(e) {
    e.preventDefault();
    const id = document.getElementById('updateComplaintId').value;
    const payload = {
        status:            document.getElementById('updateStatus').value,
        priority:          document.getElementById('updatePriority').value,
        comment:           document.getElementById('updateComment').value,
        resolutionComment: document.getElementById('updateResolution').value
    };
    try {
        const res = await Api.complaints.updateStatus(id, payload);
        if (res && res.success) {
            Toast.success('Complaint updated successfully.');
            closeModal('updateComplaintModal');
            loadComplaints();
        } else { Toast.error(res?.error || 'Update failed.'); }
    } catch { Toast.error('Error updating complaint.'); }
}

async function submitNewComplaint(e) {
    e.preventDefault();
    const payload = {
        title:       document.getElementById('newComplaintTitle').value.trim(),
        description: document.getElementById('newComplaintDesc').value.trim(),
        categoryId:  document.getElementById('newComplaintCategory').value || null,
        priority:    document.getElementById('newComplaintPriority').value
    };
    if (!payload.title || !payload.description) { Toast.warning('Title and description are required.'); return; }
    const btn = document.getElementById('submitComplaintBtn');
    btn.disabled = true;
    try {
        const res = await Api.complaints.submit(payload);
        if (res && res.success) {
            Toast.success('Complaint submitted! AI analysis in progress...');
            closeModal('newComplaintModal');
            document.getElementById('newComplaintForm').reset();
            loadMyComplaints();
        } else { Toast.error(res?.error || 'Submission failed.'); }
    } catch { Toast.error('Error submitting complaint.'); }
    finally { btn.disabled = false; }
}
