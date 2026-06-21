/* ============================================================
   Civix – Residents Module
   ============================================================ */

let _allResidents = [];

async function loadResidents() {
    showLoading('residentsTableBody', 'Loading residents...');
    try {
        const res = await Api.residents.all(App.societyId());
        if (res && res.success) {
            _allResidents = res.data;
            renderResidentsTable(_allResidents);
        } else {
            showEmpty('residentsTableBody', 'fa-users', 'No Residents', 'No residents found.');
        }
    } catch { Toast.error('Failed to load residents.'); }
}

function renderResidentsTable(list) {
    const tbody = document.getElementById('residentsTableBody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:40px"><div class="empty-icon"><i class="fa-solid fa-users"></i></div><h3>No Residents</h3><p>Add your first resident using the button above.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(r => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:grid;place-items:center;color:#fff;font-weight:700;font-size:.85rem;flex-shrink:0">
                        ${(r.fullName||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <div class="font-bold" style="font-size:.88rem">${escHtml(r.fullName)}</div>
                        <div class="text-muted text-sm">${escHtml(r.email)}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="font-bold">${escHtml(r.unitNumber)}</div>
                <div class="text-muted text-sm">${r.blockName ? 'Block ' + escHtml(r.blockName) : ''}</div>
            </td>
            <td class="text-sm">${escHtml(r.phone || '—')}</td>
            <td>${statusBadge(r.occupancyType)}</td>
            <td class="text-muted text-sm">${formatDate(r.moveInDate)}</td>
            <td>
                <span class="badge ${r.isActive ? 'badge-resolved' : 'badge-rejected'}">${r.isActive ? 'Active' : 'Inactive'}</span>
            </td>
            <td>
                <div style="display:flex;gap:6px">
                    <button class="btn btn-sm btn-secondary" onclick="openEditResident(${r.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    ${r.isActive ? `<button class="btn btn-sm btn-danger" onclick="deactivateResident(${r.id}, '${escHtml(r.fullName)}')" title="Deactivate"><i class="fa-solid fa-user-slash"></i></button>` : ''}
                </div>
            </td>
        </tr>`).join('');
}

function filterResidents() {
    const search = (document.getElementById('searchResident')?.value || '').toLowerCase();
    const type   = document.getElementById('filterOccupancy')?.value || '';
    const active = document.getElementById('filterActive')?.value;
    const filtered = _allResidents.filter(r =>
        (!search || r.fullName.toLowerCase().includes(search) || r.unitNumber.toLowerCase().includes(search) || (r.email||'').toLowerCase().includes(search)) &&
        (!type   || r.occupancyType === type) &&
        (active === '' || active === undefined || String(r.isActive) === active)
    );
    renderResidentsTable(filtered);
}

function openAddResident() {
    document.getElementById('residentModalTitle').textContent = 'Add Resident';
    document.getElementById('residentForm').reset();
    document.getElementById('residentId').value = '';
    document.getElementById('residentPasswordGroup').classList.remove('hidden');
    openModal('residentModal');
}

function openEditResident(id) {
    const r = _allResidents.find(x => x.id === id);
    if (!r) return;
    document.getElementById('residentModalTitle').textContent = 'Edit Resident';
    document.getElementById('residentId').value              = r.id;
    document.getElementById('residentFullName').value        = r.fullName;
    document.getElementById('residentEmail').value           = r.email;
    document.getElementById('residentPhone').value           = r.phone || '';
    document.getElementById('residentUnit').value            = r.unitNumber;
    document.getElementById('residentBlock').value           = r.blockName || '';
    document.getElementById('residentFloor').value           = r.floorNumber || '';
    document.getElementById('residentOccupancy').value       = r.occupancyType;
    document.getElementById('residentMoveIn').value          = r.moveInDate || '';
    document.getElementById('residentEmergencyName').value   = r.emergencyContactName || '';
    document.getElementById('residentEmergencyPhone').value  = r.emergencyContactPhone || '';
    document.getElementById('residentPasswordGroup').classList.add('hidden');
    openModal('residentModal');
}

async function submitResidentForm(e) {
    e.preventDefault();
    const id = document.getElementById('residentId').value;
    const payload = {
        fullName:             document.getElementById('residentFullName').value.trim(),
        email:                document.getElementById('residentEmail').value.trim(),
        phone:                document.getElementById('residentPhone').value.trim(),
        unitNumber:           document.getElementById('residentUnit').value.trim(),
        blockName:            document.getElementById('residentBlock').value.trim() || null,
        floorNumber:          parseInt(document.getElementById('residentFloor').value) || null,
        occupancyType:        document.getElementById('residentOccupancy').value,
        moveInDate:           document.getElementById('residentMoveIn').value || null,
        emergencyContactName: document.getElementById('residentEmergencyName').value.trim() || null,
        emergencyContactPhone:document.getElementById('residentEmergencyPhone').value.trim() || null,
    };
    if (!id) {
        payload.password = document.getElementById('residentPassword').value;
    }
    const btn = document.getElementById('saveResidentBtn');
    btn.disabled = true;
    try {
        const res = id
            ? await Api.residents.update(id, payload)
            : await Api.residents.add(App.societyId(), payload);
        if (res && res.success) {
            Toast.success(id ? 'Resident updated.' : 'Resident added successfully.');
            closeModal('residentModal');
            loadResidents();
        } else {
            const msg = res?.error || (typeof res?.data === 'object' ? Object.values(res.data).join(', ') : 'Save failed.');
            Toast.error(msg);
        }
    } catch { Toast.error('Error saving resident.'); }
    finally { btn.disabled = false; }
}

async function deactivateResident(id, name) {
    if (!confirmAction(`Deactivate ${name}? They will lose system access.`)) return;
    try {
        const res = await Api.residents.deactivate(id);
        if (res && res.success) {
            Toast.success(`${name} deactivated.`);
            loadResidents();
        } else { Toast.error(res?.error || 'Action failed.'); }
    } catch { Toast.error('Error deactivating resident.'); }
}

// ── Profile (Resident self-view) ───────────────────────────────
async function loadProfile() {
    try {
        const res = await Api.residents.profile();
        if (!res || !res.success) { Toast.error('Could not load profile.'); return; }
        const r = res.data;
        document.getElementById('profileAvatar').textContent = (r.fullName||'U').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
        document.getElementById('profileName').textContent   = r.fullName;
        document.getElementById('profileUnit').textContent   = `Unit ${r.unitNumber}${r.blockName ? ', Block '+r.blockName : ''}`;
        document.getElementById('profileSociety').textContent = r.societyName;
        document.getElementById('pfFullName').value  = r.fullName  || '';
        document.getElementById('pfPhone').value     = r.phone     || '';
        document.getElementById('pfEmail').value     = r.email     || '';
        document.getElementById('pfUnit').value      = r.unitNumber|| '';
        document.getElementById('pfBlock').value     = r.blockName || '';
        document.getElementById('pfFloor').value     = r.floorNumber || '';
        document.getElementById('pfOccupancy').value = r.occupancyType || '';
        document.getElementById('pfMoveIn').value    = r.moveInDate || '';
        document.getElementById('pfEmgName').value   = r.emergencyContactName  || '';
        document.getElementById('pfEmgPhone').value  = r.emergencyContactPhone || '';
    } catch { Toast.error('Error loading profile.'); }
}

async function saveProfile(e) {
    e.preventDefault();
    const payload = {
        fullName:             document.getElementById('pfFullName').value.trim(),
        phone:                document.getElementById('pfPhone').value.trim(),
        emergencyContactName: document.getElementById('pfEmgName').value.trim()  || null,
        emergencyContactPhone:document.getElementById('pfEmgPhone').value.trim() || null,
    };
    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    try {
        const res = await Api.residents.updateProfile(payload);
        if (res && res.success) {
            Toast.success('Profile updated successfully.');
            loadProfile();
        } else { Toast.error(res?.error || 'Update failed.'); }
    } catch { Toast.error('Error saving profile.'); }
    finally { btn.disabled = false; }
}
